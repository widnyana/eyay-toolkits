# pi-coordinator

Claude Code acts as coordinator: it plans a job, hands each small coding task to a separate [`pi`](https://github.com/badlogic/pi-mono) worker over its RPC mode, watches the workers, and lands passing work on local `main` as one squash commit per task. Built for cheap, slow models; uses `pi`'s own configured default model unless `PI_MODEL` is set.

## Install

```bash
/plugin marketplace add widnyana/eyay-toolkits
/plugin install pi-coordinator@eyay-toolkits
```

Needs `pi`, `node` and `git` on `PATH`. Claude Code only: the workflow uses the Monitor tool.

## Usage

Say "use pi", "delegate to pi" or "be the coordinator". The skill then:

1. Splits the job into 1 to 3 file tasks and writes one prompt per task with exact edits (`references/prompt-template.md`).
2. Launches each worker in its own worktree: `PI_VERIFY_CMD='<checks>' nohup scripts/launch.sh <unit> &`.
3. Watches with `scripts/monitor.sh <unit>...` (DONE within 10 s, status every 90 s). Humans can run `scripts/tail.sh <unit>...` for a live, readable stream — Ctrl-C anytime, it never touches the workers:

   ```bash
   # one worker, or list several to interleave them with [unit] prefixes
   scripts/tail.sh auth-fix
   scripts/tail.sh auth-fix migration docs-sweep
   ```

   Output (timestamped; safe to stop and re-run to resume):

   ```
   06:13:20 [auth-fix] I'll fix the middleware import first.
   06:13:21 [auth-fix] tool bash: git status --porcelain
   06:13:25 [auth-fix] tool bash ERROR: fatal: not a git repo
   06:13:28 [auth-fix] --- settled ---
   [auth-fix] DONE: PASS
   ```
4. Lands with `scripts/land.sh <unit>` (squash, remove worktree and branch, never push).

## Scripts

| Script | Purpose |
|---|---|
| `launch.sh` | Create a worktree from `main` and run one blocking worker. Use `nohup ... &`. |
| `continue.sh` | Another worker run in the *existing* worktree — follow-ups, multi-part features that land as one squash. |
| `monitor.sh` | Agent-facing watcher: `DONE` lines + per-worker status. |
| `tail.sh` | Human-only live stream (`assistant text`, tool calls, errors, final result). Ctrl-C anytime; never touches workers. |
| `land.sh` | Gate + squash-merge onto local `main`, remove worktree and branch, never push. |
| `pi-run.mjs` | The RPC driver: tool cap, loop nudge, idle watchdog, driver-owned verify gate. |
| `slim-args.sh` | Default slim worker flags (sourced by launch/continue). |

## What makes it fast

- Driver gate: with `PI_VERIFY_CMD` set, the worker only edits and commits. The driver (`scripts/pi-run.mjs`) checks a clean tree and a commit, runs the checks, and sends failures back to the same pi session (`PI_VERIFY_ROUNDS`, default 2). `land.sh` skips its own re-run when `verify.ok` matches HEAD.
- Tool cap (`MAXTOOLS`), a nudge when any tool call repeats a third time, and a 6 minute idle watchdog.
- Slim workers (`scripts/slim-args.sh`): no pi packages, skills or context files, thinking off; only the `block-forbidden-git-add` guard extension (set `PI_GUARD_EXT` when it is not in this repo checkout).
- `events.jsonl` lines carry a `t` timestamp, so slow runs can be measured.

Exit codes of `pi-run.mjs`: 0 settled (and verified when gated), 1 error, 2 timeout, 3 stalled, 4 verify failed. If the `pi` process itself crashes, `result.txt` is written with `WORKER EXITED <code>` so the monitor ends instead of polling a dead worker.
