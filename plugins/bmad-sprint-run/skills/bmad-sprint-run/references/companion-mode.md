# Companion Mode (Python Orchestrator)

When `sprint-runner.py` drives the sprint, Claude Code is a subprocess. The orchestrator owns everything that a single Claude session can't reliably manage: state persistence across restarts, retry counting, process cleanup, and mutual exclusion.

Each Claude Code invocation is a fresh `--no-session-persistence` session. The orchestrator injects context via `--append-system-prompt` before each call.

## What the orchestrator owns

| Responsibility | How |
|----------------|-----|
| State machine transitions | Reads/writes `sprint-status.yaml` and `.sprint-runner-state.yaml` after each step |
| Phase tracking | Writes `phase: dev-story/quality-gate/code-review` before each long operation — visible to crash recovery |
| Retry counting | In-memory dict, persisted to YAML after each failure, restored on restart |
| Quality gates | Runs typecheck + tests as direct subprocesses, not via Claude |
| Cost tracking | Accumulates `total_cost_usd` from stream-json for informational logging — no enforcement |
| Git checkpoint | Records HEAD hash before dev-story as the quality-gate diff base. Read-only — never resets, reverts, commits, or rolls back |
| Process lock | `fcntl.flock` on `.sprint-runner.lock` — exclusive, released by kernel on any exit including SIGKILL |
| Subprocess cleanup | `proc.terminate()` → `proc.wait()` on interrupt; `PR_SET_PDEATHSIG=SIGTERM` so Claude Code dies if the runner is killed |

## What Claude Code does in companion mode

Execute the invoked skill (`/bmad-dev-story`, `/bmad-code-review`) and nothing else.

Specifically — do **not**:
- Modify `sprint-status.yaml` or `.sprint-runner-state.yaml` (the orchestrator owns these)
- Run typecheck or tests (the orchestrator runs quality gates directly)
- Loop to the next story (the orchestrator controls the loop)

Git commits are Claude Code's responsibility: the bmad skills commit their own work, and the injected system prompt instructs periodic commits. The orchestrator never commits — its `git_ops.py` is read-only and cannot reset, revert, or stage anything.

The only exception to the "do not modify state" rule: `bmad-dev-story` writes the story file and updates story status to `review`. That's by design — it's the skill's own output.

## Injected system prompt

Every invocation receives:

```
Quality Standards (NON-NEGOTIABLE):
- Do NOT cut corners or take shortcuts
- Do NOT find easy fixes — find correct fixes
- Do NOT chase easy wins — implement features properly and completely
- Follow high-quality software engineering standards at all times
- Every function must work as specified — start it, finish it
- No partial features, no TODO stubs for core logic

Sprint Orchestrator Context:
- Task: [description]
- Story key: [key]
- Retry attempt: [N/budget]      ← only on retries
- Previous failures: [details]   ← only on retries
- Recent sprint context: [digest] ← when digest exists
- Commit your work in small, frequent increments — one commit per logical chunk
  as you complete it. Do not wait until the end or batch many changes into one
  large commit. Stage files by explicit path, never use 'git add -A' or 'git add .'.
```

## CLI flags used

```bash
claude -p "<prompt>" \
  --output-format stream-json \
  --include-partial-messages \
  --include-hook-events \
  --verbose \
  --dangerously-skip-permissions \
  --append-system-prompt "<context>" \
  [--effort <level>] \
  [--model <model>] \
  [--allowedTools <tools>]
```

`--dangerously-skip-permissions` is always set. The orchestrator is designed for unattended execution — permission prompts would block it.

## Phase tracking

The runner writes `phase` to `.sprint-runner-state.yaml` before every long operation:

| Phase value | When written |
|-------------|--------------|
| `create-story` | Before invoking `bmad-create-story` |
| `dev-story` | Before invoking `bmad-dev-story` |
| `quality-gate` | Before running typecheck + tests |
| `code-review` | Before invoking `bmad-code-review` |
| `""` | After story reaches `done` or `blocked` |

If the runner dies mid-invocation, the phase field tells you what was interrupted. On restart, the runner re-reads `sprint-status.yaml` (not the phase) to determine the next action — phase is informational, not used for routing.

## Retry count persistence

`retry_count` in `.sprint-runner-state.yaml` tracks how many times the current story has failed. It's:

- Written after every failure (before the next attempt)
- Restored into the in-memory retry dict at the start of each loop iteration
- Reset to 0 when the story completes or gets blocked

This means the retry budget survives process restarts. A story that failed twice before a crash has one retry left, not three.

## No rollback — retries fix forward

The runner never rolls back. There is no `git reset --hard`, no `git checkout`, no `git restore`, no `git clean`, no `rm`. `git_ops.py` is read-only by construction.

When a story fails a quality gate or code review:

- **Retries remaining:** the story is set back to `in-progress` and re-run. All commits the dev cycle already produced are kept — the retry fixes the existing implementation forward, with the failure detail injected into the system prompt. It does not rebuild from scratch.
- **Retry budget exhausted:** the story is marked `blocked` with its commits intact, and the runner moves to the next story.

A false-failing quality gate previously triggered `git reset --hard` to a pre-story checkpoint, destroying completed and committed work. Removing the rollback eliminates that failure mode entirely: a misbehaving gate can now at worst block a story, never delete its code.
