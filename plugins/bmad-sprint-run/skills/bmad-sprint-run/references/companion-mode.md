# Companion Mode (Python Orchestrator)

When the Python orchestrator (`sprint-runner.py`) drives Claude Code, the orchestration loop runs externally. Claude Code only executes the invoked skill per invocation.

## How the Orchestrator Works

The orchestrator manages:
- Sprint state machine (all transitions)
- Git operations (checkpoint, rollback, periodic commits)
- Quality gates (typecheck + tests via subprocess)
- Retry logic (in-memory retry counts survive `git reset --hard`)
- Budget tracking (per-invocation and total spend caps)

Each Claude Code invocation is a fresh session. The orchestrator injects context via `--append-system-prompt`:
- Story ID and retry attempt number
- Previous failure details (on retry)
- Recent sprint context (digest summary)

## What Claude Code Should Do in Companion Mode

1. Execute the invoked skill (e.g., `/bmad-dev-story`, `/bmad-code-review`) without managing state transitions.
2. Do not modify `sprint-status.yaml` or `.sprint-runner-state.yaml` - the orchestrator owns these.
3. Do not run typecheck or tests - the orchestrator runs quality gates directly.
4. Do not create git commits - the orchestrator manages the git lifecycle.
5. Focus solely on implementation work and produce the expected output for the invoked skill.

## CLI Flags the Orchestrator Uses

```bash
claude -p "<prompt>" \
  --output-format stream-json \
  --include-partial-messages \
  --include-hook-events \
  --dangerously-skip-permissions \
  --no-session-persistence \
  --max-budget-usd <amount> \
  --append-system-prompt "<context>"
```
