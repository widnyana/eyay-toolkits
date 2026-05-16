# Orchestration Steps

Detailed procedures for each step of the sprint runner loop. Load this reference for exact commands, error conditions, and recovery paths.

## STEP 0: Initialize

### Lock check (advisory — skill-driven mode only)

`sprint-runner.py` holds a kernel-level `fcntl.flock` lock and will refuse to start if another instance is running. In skill-driven mode, Claude cannot hold a kernel lock, so perform this advisory check before reading any state:

```bash
if [ -f .sprint-runner.lock ]; then
  pid=$(cat .sprint-runner.lock 2>/dev/null)
  if kill -0 "$pid" 2>/dev/null; then
    echo "ERROR: sprint-runner already running (PID $pid). Exiting."
    exit 1
  fi
  # Stale lock — process is dead, safe to remove
  rm -f .sprint-runner.lock
fi
```

If multiple Claude Code sessions run this skill simultaneously, they pass the advisory check independently and both proceed — **there is no kernel-level protection in skill-driven mode**. The `sprint-runner.py` companion is the only fully safe path for unattended multi-story runs.

### Re-read state

Re-read all state files from disk using the Read tool. Do not trust in-memory values from the previous iteration.

Files to read:
- `SPRINT_STATUS_PATH` (sprint-status.yaml)
- `RUNNER_STATE_PATH` (.sprint-runner-state.yaml)
- `DIGEST_PATH` (.sprint-context-digest.md)

If `RUNNER_STATE_PATH` does not exist, create it:

```yaml
current_story: null
retry_count: 0
checkpoint_hash: null
started_at: "<ISO timestamp>"
stories_completed: 0
stories_blocked: []
phase: ""
```

`phase` records what operation is active right now. Valid values: `create-story`, `dev-story`, `quality-gate`, `code-review`, `retry`, `""` (idle/complete). Write it before starting each long operation and clear it (set to `""`) when the story reaches `done` or `blocked`. This is the primary crash-recovery signal — on restart, STEP 1 uses `sprint-status.yaml` for routing but `phase` tells a human (or external monitor) what was interrupted.

If `DIGEST_PATH` does not exist, create it with header: `# Sprint Context Digest`

Discover project workspaces by reading `CLAUDE.md` and scanning the repo root. For each directory containing `package.json`, `Cargo.toml`, `Anchor.toml`, or equivalent build manifests, record:
- Typecheck command (e.g., `bun run typecheck`, `cargo check`)
- Test command (e.g., `bun run test`, `cargo test`)
- Infrastructure dependencies (e.g., Docker services, local validators)

If `CLAUDE.md` documents build/test commands, prefer those over scanning.

## STEP 1: Resolve Next Action

Read `SPRINT_STATUS_PATH` using the Read tool. Scan `development_status` section for story entries (keys matching pattern `N-N-*`).

Priority order (process in this sequence, stop at first match):

1. Any story with status `in-progress` -> action: `preflight`
2. Any story with status `review` -> action: `quality_gate`
3. Any story with status `ready-for-dev` -> action: `preflight`
4. Any story with status `backlog` -> action: `create_story`
5. No stories remaining (all `done` or `blocked`) -> action: `sprint_complete`

Within each priority, pick the lowest-numbered story. Sort by (epic_number, story_number) ascending. Story key format: `E-S-slug` where E is epic number and S is story number.

For `review` stories: read the story file. If it lacks a completed Dev Agent Record with non-empty File List, reset its status to `ready-for-dev` and re-resolve.

Write the chosen story ID to `RUNNER_STATE_PATH` as `current_story`.

## STEP 2: Create Story

Write `RUNNER_STATE_PATH`:
```yaml
phase: create-story
current_story: <story_id>
```

Invoke:

```
Skill(skill: "bmad-create-story")
```

After completion:
1. Verify a new story file appeared in `STORY_DIR`.
2. Verify status changed from `backlog` to `ready-for-dev` in `SPRINT_STATUS_PATH`.
3. Update `RUNNER_STATE_PATH` with the actual story ID created.

## STEP 3: Pre-Flight Check

Determine which workspaces the story touches by reading file paths mentioned in the story tasks.

For each relevant workspace, verify:
- **Runtime dependencies** (e.g., Docker services): `timeout 10s docker compose ps <services> --format json 2>&1`
- **Toolchain availability**: `bun --version`, `rustc --version`, `solana --version`, etc.
- **Local validators** (e.g., surfpool, solana-test-validator): check process is running

If any check fails: print the failure and what needs to be started. Transition to STEP 7 with `infrastructure-blocked` status. Do not retry.

## STEP 4: Snapshot and Dispatch

### 4a: Checkpoint commit

```bash
git add -A
git commit -m "checkpoint: pre-story [STORY_ID]" --allow-empty
git rev-parse --verify HEAD
```

Record the commit hash in `RUNNER_STATE_PATH` as `checkpoint_hash`.

### 4b: Inject context

Read `DIGEST_PATH` and the current story file. State: "Executing story [ID]. Recent sprint context: [summarize digest]."

### 4c: Invoke dev-story

Write `RUNNER_STATE_PATH`:
```yaml
phase: dev-story
```

```
Skill(skill: "bmad-dev-story")
```

After completion, read `SPRINT_STATUS_PATH` and verify the story is now `review`.

## STEP 5: Quality Gate

### 5a: Determine affected workspaces

Write `RUNNER_STATE_PATH`:
```yaml
phase: quality-gate
```

```bash
git diff --name-only [checkpoint_hash]
```

Map changed files to workspaces using the workspace map. If any changed file matches no workspace, run ALL workspace checks defensively.

### 5b: Run typecheck

For each affected workspace, execute its typecheck command. On failure: print error output, reset story status to `ready-for-dev`, transition to STEP 6.

### 5c: Run test suite

For each affected workspace, execute its test command. On failure: print failing test output, reset story status to `ready-for-dev`, transition to STEP 6.

### 5d: Invoke code-review

Write `RUNNER_STATE_PATH`:
```yaml
phase: code-review
```

```
Skill(skill: "bmad-code-review")
```

Read the story file and verify it contains a review findings section (headings matching `Review`, `Findings`, or `AI-Review`). If missing: print "CODE-REVIEW VERIFICATION FAILED", transition to STEP 6.

Categorize findings:
- `critical`: blocking, must fix
- `major`: significant, should fix
- `minor`: cosmetic/naming
- `decision_needed`: requires human judgment

Routing:
- Any `critical` findings -> print "REVIEW GATE FAILED: [N] critical findings", transition to STEP 6
- Any `decision_needed` but zero `critical` -> mark story `blocked`, transition to STEP 0
- Zero `critical` and zero `decision_needed` -> story passes, transition to 5f

### 5f: Write digest entry

Append to `DIGEST_PATH`:

```markdown
## Story [ID]: [title]
Files: [comma-separated changed files]
Decisions: [1-2 sentence summary]
Deviations: [spec deviations or "none"]
Review: [X critical, Y major, Z minor or "clean pass"]
```

Prune entries beyond `DIGEST_SIZE` (oldest first).

### 5g: Epic boundary check

Extract epic number from story key (prefix before first dash). Check if ALL stories with that epic prefix are `done`. If so:

1. Run typecheck + tests across ALL workspaces.
2. On failure: print "EPIC BOUNDARY GATE FAILED", mark epic as `blocked`.
3. On pass: print "Epic [N] complete. Full suite green.", mark epic as `done`.

### 5h: Advance sprint

1. Update `RUNNER_STATE_PATH`: `current_story: null`, `retry_count: 0`, increment `stories_completed`.
2. Commit: `git add -A && git commit -m "story [ID]: completed"`
3. Print: "Story [ID] completed. [N] stories done, [M] remaining."
4. Transition to STEP 0.

## STEP 6: Retry Handler

### 6a: Increment retry count

Update `RUNNER_STATE_PATH` with incremented `retry_count`.

### 6b: Check retry budget

If `retry_count >= RETRY_BUDGET` (default 3):
1. Print "RETRY BUDGET EXHAUSTED for story [ID]"
2. Rollback: `git reset --hard [checkpoint_hash]`
3. Rewrite `RUNNER_STATE_PATH` with post-rollback values (the reset reverted all files):
   ```yaml
   current_story: null
   retry_count: 0
   checkpoint_hash: null
   started_at: <keep existing>
   stories_completed: <keep existing>
   stories_blocked: <append {story: ID, reason: "retry budget exhausted", attempts: N}>
   ```
4. Override story status to `blocked` in `SPRINT_STATUS_PATH`.
5. Transition to STEP 0.

### 6c: Determine retry strategy

| Attempt | Strategy |
|---------|----------|
| 1 | Re-invoke dev-story. Story status was reset to `ready-for-dev`. |
| 2 | Invoke `bmad-quick-dev` with failing tests/review findings as intent. Use `git diff --name-only [checkpoint_hash]` for workspace detection. |
| 3 | Re-invoke dev-story with explicit context about what failed in previous attempts injected into the prompt. |

### 6d: Execute retry

- Strategy 1, 3: Transition to STEP 4.
- Strategy 2: Invoke `Skill(skill: "bmad-quick-dev")`, then transition to STEP 5.

## STEP 7: Finalize

1. Print sprint summary: stories completed, blocked, epics done/incomplete, blocked reasons.
2. Commit final state: `git add -A && git commit -m "sprint-run: [N] stories completed, [M] blocked"`
3. If blocked stories exist: list which need manual intervention.
4. If all stories done: suggest running `/bmad-retrospective` for each epic.
5. STOP. This is the only valid termination point.
