---
name: bmad-sprint-run
description: |
  This skill should be used when the user says "run the sprint", "autonomous sprint", "run all stories", "execute sprint plan", "complete all epics", or asks to autonomously execute all stories in the current sprint. Drives Claude Code through create-story, dev-story, quality gates, and code-review in a continuous loop without human intervention until all stories are done or blocked.
---

# BMad Sprint Runner

Autonomously execute ALL stories in ALL epics in the current sprint. Runs as a single continuous loop: no pauses between stories, no confirmation prompts, no stopping until every story reaches `done` or `blocked`.

## Execution Rule

After completing ANY action (story done, story blocked, retry exhausted, story created), immediately begin the next story by returning to STEP 0. The only valid exit is STEP 7 (all stories resolved). Every other step unconditionally transitions to another step. Never ask for permission to continue.

## Story State Machine

Valid story statuses: `backlog` | `ready-for-dev` | `in-progress` | `review` | `done` | `blocked`

```
backlog --[create-story]--> ready-for-dev
ready-for-dev --[checkpoint]--> in-progress
in-progress --[dev-story]--> review
review --[quality gate pass + review pass]--> done
review --[quality gate fail]--> ready-for-dev (retry)
review --[retry exhausted]--> blocked
review --[decision_needed]--> blocked
ANY --[infrastructure fail]--> STOP (not blocked, sprint halts)
```

Invalid transitions (MUST NOT occur):
- `backlog` -> anything other than `ready-for-dev`
- `done` -> anything (terminal state)
- `blocked` -> anything (terminal state for this sprint run)
- Skipping `in-progress` (every dev cycle must checkpoint first)

## Forbidden Actions

### State Safety

- FORBIDDEN: Mark a story `done` unless quality gates pass AND code review reports zero `critical` findings
- FORBIDDEN: Skip the quality gate (typecheck + tests) after dev-story
- FORBIDDEN: Skip code review after quality gate pass
- FORBIDDEN: Proceed past a failing quality gate or failing code review
- FORBIDDEN: Modify story content outside of skill invocations, EXCEPT status transitions to `blocked` or `ready-for-dev`
- FORBIDDEN: Invent review findings. If the review section is absent from the story file, treat as failure
- FORBIDDEN: Transition a story out of `done` or `blocked`

### Git Safety

- FORBIDDEN: Use `git stash` (removes untracked bmad artifacts)
- FORBIDDEN: Push to remote (local state only)
- FORBIDDEN: Run on branch `main` or `master`
- FORBIDDEN: Skip checkpoint before dev-story invocation
- FORBIDDEN: Fail to rewrite `RUNNER_STATE_PATH` after `git reset --hard` (rollback reverts all on-disk files)
- FORBIDDEN: Use `git add .` with dot - use `git add -A`

### Execution Flow

- FORBIDDEN: Stop between stories
- FORBIDDEN: Ask "Should I continue?" or "Ready for the next story?"
- FORBIDDEN: Print a summary and wait for user input mid-sprint
- FORBIDDEN: Run stories in parallel (strictly sequential)
- FORBIDDEN: Skip a story without marking it `blocked` with a reason
- FORBIDDEN: Assume in-memory state is current - always re-read from disk at STEP 0

### Communication

- FORBIDDEN: Use second-person language in output ("you should", "I recommend you")
- FORBIDDEN: Print verbose explanations between steps - one-line status updates only
- FORBIDDEN: Stop execution to explain what the runner is about to do

## Configuration

Fixed values. Do not change unless the user explicitly requests it.

| Setting | Value | Purpose |
|---------|-------|---------|
| `RETRY_BUDGET` | 3 | Max dev-story + code-review cycles per story |
| `DIGEST_SIZE` | 5 | Rolling digest window (number of completed stories) |
| `SPRINT_STATUS_PATH` | `docs/_bmad_output/implementation-artifacts/sprint-status.yaml` | Sprint state |
| `STORY_DIR` | `docs/_bmad_output/implementation-artifacts` | Story file location |
| `RUNNER_STATE_PATH` | `docs/_bmad_output/implementation-artifacts/.sprint-runner-state.yaml` | Retry/checkpoint tracking |
| `DIGEST_PATH` | `docs/_bmad_output/implementation-artifacts/.sprint-context-digest.md` | Rolling context log |

## Prerequisites

Before entering the loop, verify:
1. `SPRINT_STATUS_PATH` exists. If missing, instruct user to run `/bmad-sprint-planning` and stop.
2. At least one story is not `done`. If all done, go to STEP 7.
3. Current branch is not `main` or `master`. If on main, instruct user to create a feature branch and stop.
4. No other sprint-runner instance is active. Check `.sprint-runner.lock` at project root:
   - If absent: continue.
   - If present: read its PID. Run `kill -0 <pid> 2>/dev/null` — exit code 0 means the process is alive.
     - Alive → print "ERROR: sprint-runner PID <pid> is already running on this project." and STOP.
     - Dead (stale lock from a crash) → remove the file with `rm -f .sprint-runner.lock` and continue.
   - Note: this is an advisory check only. `sprint-runner.py` enforces the lock at the kernel level via `fcntl.flock`. The skill cannot hold a kernel lock across tool calls.

## Orchestration Loop

```
STEP 0 (Re-read state, discover workspaces)
  |
  v
STEP 1 (Resolve next action) ---sprint_complete---> STEP 7 (Finalize) --> STOP
  |
  +-- create_story --> STEP 2 (Invoke bmad-create-story) --> STEP 3
  +-- preflight    --> STEP 3 (Check infrastructure)
  +-- quality_gate --> STEP 5
  |
STEP 3 --infra_fail--> STEP 7
  |
  v
STEP 4 (Checkpoint + invoke bmad-dev-story)
  |
  v
STEP 5 (Typecheck + Tests + bmad-code-review)
  |-- fail (quality)  --> STEP 6 (Retry handler)
  |-- fail (critical)  --> STEP 6
  |-- fail (decision)  --> mark blocked --> STEP 0
  |-- pass            --> 5f (digest) --> 5g (epic boundary) --> 5h (commit) --> STEP 0
  |
STEP 6 --budget_ok--> STEP 4 (retry)
       --exhausted--> mark blocked --> STEP 0
```

### STEP 0: Initialize

Re-read `SPRINT_STATUS_PATH`, `RUNNER_STATE_PATH`, and `DIGEST_PATH` from disk using the Read tool. Do not use cached values. Discover project workspaces by reading `CLAUDE.md` and scanning for build manifests. Print one-line status: "Sprint: [N] done, [M] remaining, [K] blocked. Next story."

### STEP 1: Resolve Next Action

Read `development_status` from `SPRINT_STATUS_PATH`. Priority order:

1. `in-progress` -> preflight with this story
2. `review` -> quality_gate (verify Dev Agent Record exists; if missing, reset to `ready-for-dev` and re-resolve)
3. `ready-for-dev` -> preflight with this story
4. `backlog` -> create_story
5. All `done`/`blocked` -> sprint_complete -> STEP 7

Sort within priority: lowest (epic, story) number first. Record chosen story as `current_story` in `RUNNER_STATE_PATH`.

### STEP 2: Create Story

Invoke `Skill(skill: "bmad-create-story")`. Verify story file appeared in `STORY_DIR` and status is `ready-for-dev`. Transition to STEP 3.

### STEP 3: Pre-Flight Check

Check infrastructure for workspaces the story touches. On failure: print failure, transition to STEP 7 (infrastructure-blocked). On pass: transition to STEP 4.

### STEP 4: Snapshot and Dispatch

Checkpoint: `git add -A && git commit -m "checkpoint: pre-story [ID]" --allow-empty`. Record hash in `RUNNER_STATE_PATH`. Read digest and story file, state context, then invoke `Skill(skill: "bmad-dev-story")`. Verify status is `review`. Transition to STEP 5.

### STEP 5: Quality Gate

5a: `git diff --name-only [checkpoint_hash]` -> map to workspaces. Unmatched files -> run ALL checks.

5b: Run typecheck per workspace. On fail: reset to `ready-for-dev`, transition to STEP 6.

5c: Run tests per workspace. On fail: reset to `ready-for-dev`, transition to STEP 6.

5d: Invoke `Skill(skill: "bmad-code-review")`. Verify findings section exists. Categorize: `critical`, `major`, `minor`, `decision_needed`.

- Any `critical` -> transition to STEP 6
- Any `decision_needed` but zero `critical` -> mark `blocked`, transition to STEP 0
- Zero `critical` and zero `decision_needed` -> pass, continue to 5f

5f: Write digest entry to `DIGEST_PATH`. Prune beyond `DIGEST_SIZE`.

5g: Check if all stories in current epic (same prefix before first dash) are `done`. If so, run full quality gate across all workspaces. Mark epic `done` or `blocked`.

5h: Update `RUNNER_STATE_PATH` (clear current_story, reset retry_count, increment stories_completed). Commit: `git add -A && git commit -m "story [ID]: completed"`. Transition to STEP 0.

### STEP 6: Retry Handler

Increment retry count. If `retry_count >= RETRY_BUDGET`: rollback (`git reset --hard [checkpoint_hash]`), rewrite `RUNNER_STATE_PATH` with post-rollback values, mark story `blocked`, transition to STEP 0.

If retries remain, choose strategy: attempt 1 = re-invoke dev-story (STEP 4), attempt 2 = invoke `bmad-quick-dev` with failure context (STEP 5), attempt 3 = dev-story with injected failure history (STEP 4).

### STEP 7: Finalize

Print sprint summary. Commit: `git add -A && git commit -m "sprint-run: [N] completed, [M] blocked"`. List blocked stories needing manual intervention. Suggest `/bmad-retrospective` per epic. STOP.

## Additional Resources

### Reference Files

For detailed step procedures with exact commands and error recovery:
- **`references/orchestration-steps.md`** - Full STEP 0-7 procedures, exact bash commands, error conditions
- **`references/error-handling.md`** - Recovery procedures for dev-story crashes, code-review failures, git errors, corrupted state
- **`references/companion-mode.md`** - Python orchestrator integration, CLI flags, what changes in external mode

### Skill Dependencies

This skill composes existing bmad skills:
- `bmad-create-story` - Story spec creation from backlog
- `bmad-dev-story` - Story implementation with TDD
- `bmad-code-review` - 3-layer adversarial review
- `bmad-quick-dev` - Targeted fix for retry attempts
