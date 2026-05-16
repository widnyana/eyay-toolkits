---
name: bmad-sprint-run
description: |
  This skill should be used when the user says "run the sprint", "autonomous sprint", "run all stories", "execute sprint plan", "complete all epics", or asks to autonomously execute all stories in the current sprint. Drives Claude Code through create-story, dev-story, quality gates, and code-review in a continuous loop without human intervention until all stories are done or blocked.
version: 1.0.0
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
review --[quality gate fail]--> in-progress (retry)
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
- FORBIDDEN: Modify story content outside of skill invocations, EXCEPT status transitions to `blocked`, `ready-for-dev`, or `in-progress`
- FORBIDDEN: Invent review findings. If the review section is absent from the story file, treat as failure
- FORBIDDEN: Transition a story out of `done` or `blocked`

### Git Safety

- FORBIDDEN: Use `git stash` (removes untracked bmad artifacts)
- FORBIDDEN: Push to remote (local state only)
- FORBIDDEN: Run on branch `main` or `master`
- FORBIDDEN: Skip recording the checkpoint hash before dev-story invocation
- FORBIDDEN: Run `git reset --hard`, `git checkout -- `, `git restore`, or `git clean` — these destroy committed or working-tree work. A false-failing quality gate once used `git reset --hard` to wipe a completed story
- FORBIDDEN: Run `rm` against the project to "clean up" — failed stories retry by fixing forward, never by deleting
- FORBIDDEN: Use `git add -A`, `git add .`, or any bulk-staging form. Enumerate changed files with `git status --porcelain` and stage each one by explicit path (`git add path/to/file`)
- FORBIDDEN: Defer work into one large commit. Commit in small, frequent increments — `bmad-dev-story` commits per logical chunk as it works, each story finalizes at its own STEP 5g, and STEP 7 only sweeps residual state files. Never batch multiple chunks or stories into a single large commit

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
4. No other sprint-runner instance is active. Perform the advisory `.sprint-runner.lock` check — exact procedure in `references/orchestration-steps.md` STEP 0. This is advisory only: `sprint-runner.py` enforces a kernel-level `fcntl.flock` that the skill cannot hold across tool calls.

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
STEP 4 (Snapshot HEAD + invoke bmad-dev-story)
  |
  v
STEP 5 (Typecheck + Tests + bmad-code-review)
  |-- fail (quality)  --> STEP 6 (Retry handler)
  |-- fail (critical)  --> STEP 6
  |-- fail (decision)  --> mark blocked --> STEP 0
  |-- pass            --> 5e (digest) --> 5f (epic boundary) --> 5g (commit) --> STEP 0
  |
STEP 6 --budget_ok--> STEP 4 (retry)
       --exhausted--> mark blocked --> STEP 0
```

Each step below is a summary. Full procedures — exact commands, sub-steps, error conditions — are in `references/orchestration-steps.md`.

### STEP 0: Initialize

Re-read `SPRINT_STATUS_PATH`, `RUNNER_STATE_PATH`, and `DIGEST_PATH` from disk with the Read tool — never trust cached values. Create `RUNNER_STATE_PATH` and `DIGEST_PATH` if absent. Discover project workspaces (typecheck/test/infra commands) from `CLAUDE.md`, falling back to build-manifest scanning. Print one-line status: "Sprint: [N] done, [M] remaining, [K] blocked. Next story."

### STEP 1: Resolve Next Action

Read `development_status` from `SPRINT_STATUS_PATH` and pick the next story by priority `in-progress` -> `review` -> `ready-for-dev` -> `backlog`, lowest (epic, story) number first. Map to action: backlog -> create_story; ready-for-dev/in-progress -> preflight; review -> quality_gate; none left -> sprint_complete (STEP 7). For `review` stories, verify the Dev Agent Record exists — if missing, reset to `ready-for-dev` and re-resolve. Record the chosen story as `current_story` in `RUNNER_STATE_PATH`.

### STEP 2: Create Story

Invoke `Skill(skill: "bmad-create-story")`. Verify a story file appeared in `STORY_DIR` and status is now `ready-for-dev`. Transition to STEP 3.

### STEP 3: Pre-Flight Check

Check infrastructure (runtime deps, toolchains, local validators) for the workspaces the story touches. On failure: print what needs starting, transition to STEP 7 (infrastructure-blocked) — do not retry. On pass: transition to STEP 4.

### STEP 4: Snapshot and Dispatch

Record current HEAD (`git rev-parse --verify HEAD`) as `checkpoint_hash` in `RUNNER_STATE_PATH` — a diff marker only, not a commit; the bmad skills create all commits. Inject digest + story context, then invoke `Skill(skill: "bmad-dev-story")`. Verify status is `review`. Transition to STEP 5.

### STEP 5: Quality Gate

Diff against `checkpoint_hash` to find affected workspaces (files matching no workspace -> run ALL checks). Run typecheck then tests per workspace; on failure reset the story to `in-progress` and transition to STEP 6. Invoke `Skill(skill: "bmad-code-review")` and verify a findings section exists (missing = failure -> STEP 6). Route on findings:

- any `critical` -> STEP 6
- any `decision_needed`, zero `critical` -> mark `blocked`, STEP 0
- zero `critical` and zero `decision_needed` -> pass

On pass: write a digest entry (prune beyond `DIGEST_SIZE`), run the full-suite epic-boundary gate if the epic is complete, update `RUNNER_STATE_PATH`, stage each changed file by explicit path (see Git Safety) and commit `story [ID]: completed`, transition to STEP 0.

### STEP 6: Retry Handler

Increment `retry_count`. If `retry_count >= RETRY_BUDGET`: mark the story `blocked`, append the reason to `stories_blocked`, transition to STEP 0. Never roll back — every commit the story produced stays on the branch for a human to inspect or salvage. If retries remain, fix forward on top of existing commits with the prior failure injected into the prompt: attempt 1 = re-invoke dev-story (STEP 4), attempt 2 = `bmad-quick-dev` with failure context (STEP 5), attempt 3 = dev-story with injected failure history (STEP 4).

### STEP 7: Finalize

Print the sprint summary. Each story's work was already committed at its own STEP 5g, so only residual files (digest, runner state) remain — stage those by explicit path and commit `sprint-run: [N] completed, [M] blocked`. List blocked stories needing manual intervention, and suggest `/bmad-retrospective` per epic. STOP — the only valid termination point.

## Additional Resources

### Reference Files

For detailed step procedures with exact commands and error recovery:
- **`references/orchestration-steps.md`** - Full STEP 0-7 procedures, exact bash commands, error conditions
- **`references/error-handling.md`** - Recovery procedures for dev-story crashes, code-review failures, git errors, corrupted state
- **`references/companion-mode.md`** - Python orchestrator integration, CLI flags, what changes in external mode

### Example Files

Annotated samples of the state files this skill reads and writes:
- **`examples/sprint-status.yaml`** - `development_status` structure: story/epic/retrospective key shapes and valid status values
- **`examples/sprint-runner-state.yaml`** - `RUNNER_STATE_PATH` schema: retry counter, checkpoint hash, blocked-story records, phase

### Skill Dependencies

This skill composes existing bmad skills:
- `bmad-create-story` - Story spec creation from backlog
- `bmad-dev-story` - Story implementation with TDD
- `bmad-code-review` - 3-layer adversarial review
- `bmad-quick-dev` - Targeted fix for retry attempts
