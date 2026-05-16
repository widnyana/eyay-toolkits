# Companion Mode (Python Orchestrator)

When `sprint-runner.py` drives the sprint, Claude Code is a subprocess. The orchestrator owns everything that a single Claude session can't reliably manage: state persistence across restarts, budget enforcement, retry counting, process cleanup, and mutual exclusion.

Each Claude Code invocation is a fresh `--no-session-persistence` session. The orchestrator injects context via `--append-system-prompt` before each call.

## What the orchestrator owns

| Responsibility | How |
|----------------|-----|
| State machine transitions | Reads/writes `sprint-status.yaml` and `.sprint-runner-state.yaml` after each step |
| Phase tracking | Writes `phase: dev-story/quality-gate/code-review` before each long operation — visible to crash recovery |
| Retry counting | In-memory dict, persisted to YAML after each failure, restored on restart |
| Quality gates | Runs typecheck + tests as direct subprocesses, not via Claude |
| Cost tracking | Accumulates `total_cost_usd` from stream-json for informational logging — no enforcement |
| Git checkpoint/rollback | Records HEAD hash before dev-story; `git reset --hard` on retry budget exhaustion |
| Process lock | `fcntl.flock` on `.sprint-runner.lock` — exclusive, released by kernel on any exit including SIGKILL |
| Subprocess cleanup | `proc.terminate()` → `proc.wait()` on interrupt; `PR_SET_PDEATHSIG=SIGTERM` so Claude Code dies if the runner is killed |

## What Claude Code does in companion mode

Execute the invoked skill (`/bmad-dev-story`, `/bmad-code-review`) and nothing else.

Specifically — do **not**:
- Modify `sprint-status.yaml` or `.sprint-runner-state.yaml` (the orchestrator owns these)
- Run typecheck or tests (the orchestrator runs quality gates directly)
- Create git commits (the orchestrator manages the git lifecycle)
- Loop to the next story (the orchestrator controls the loop)

The only exception: `bmad-dev-story` writes the story file and updates story status to `review`. That's by design — it's the skill's own output.

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
- Commit your work periodically with git as you complete each logical chunk.
  Do not wait until the end.
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

## Rollback safety

After `git reset --hard [checkpoint_hash]`, all files on disk revert — including `sprint-status.yaml` and `.sprint-runner-state.yaml`. The orchestrator immediately rewrites both with the correct post-rollback state:

```yaml
# .sprint-runner-state.yaml after rollback
current_story: null
retry_count: 0
checkpoint_hash: null
started_at: <keep existing>
stories_completed: <keep existing>
stories_blocked: <append {story, reason}>
phase: ""
```

The story status in `sprint-status.yaml` is also overridden to `blocked` since the rollback restored its previous value.
