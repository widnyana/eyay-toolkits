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
| `monitor.sh` | Agent-facing watcher: `DONE` lines + per-worker status; guards missing driver output (launch failed / `PI_WORK` mismatch) with a remedy line, exits 1 after 5 min of nothing. |
| `tail.sh` | Human-only live stream (`assistant text`, tool calls, errors, final result). Ctrl-C anytime; never touches workers. |
| `land.sh` | Gate + squash-merge onto local `main`, remove worktree and branch, never push. |
| `pi-run.mjs` | The RPC driver: tool cap, loop nudge, idle watchdog, driver-owned verify gate. |
| `slim-args.sh` | Default slim worker flags (sourced by launch/continue). |

## What makes it fast

- Driver gate, baseline-aware: with `PI_VERIFY_CMD` set, the worker only edits and commits. The driver (`scripts/pi-run.mjs`) checks a clean tree and a commit, runs the checks, and sends failures back to the same pi session (`PI_VERIFY_ROUNDS`, default 2). Before the first turn it runs the verify command once on `PI_BASE` (throwaway worktree, cached per base+cmd in `$PI_WORK`, shared by all workers) and fails a worker only on failures *new* vs that baseline — a dirty repo no longer masks results. Set `PI_BASELINE_PREP` if the baseline worktree needs installed deps. `land.sh` skips its own re-run when `verify.ok` matches HEAD (true for baseline passes too).
- Tool cap (`MAXTOOLS`), a nudge when any tool call repeats a third time, and a 6 minute idle watchdog.
- Slim workers (`scripts/slim-args.sh`): no pi packages, skills or context files, thinking off; only the `block-forbidden-git-add` guard extension. The guard is structural: launch refuses without it (explicit opt-out `PI_GUARD_EXT=off`).
- `events.jsonl` lines carry a `t` timestamp, so slow runs can be measured.
- Explicit outcomes: `result.txt`'s first line is `OUTCOME: <verdict>` (VERIFIED, SETTLED-UNVERIFIED, CAPPED, VERIFY-FAILED, TIMEOUT, STALLED, ERROR, EXITED) on every exit path, and `state.txt` records phase transitions the monitor prints as they happen — a run that ended settled-but-unverified never masquerades as verified.
- Pre-flight in `launch.sh`: aborts on missing `node` or bad `PI_BASE`, warns on unset `MAXTOOLS` / `PI_VERIFY_CMD` / `PI_BASELINE_PREP`.

Exit codes of `pi-run.mjs`: 0 settled (and verified when gated), 1 error, 2 timeout, 3 stalled, 4 verify failed. If the `pi` process itself crashes, `result.txt` is written with `OUTCOME: EXITED(<code>)` so the monitor ends instead of polling a dead worker.

## Tests

`bash test.sh` (from the skill directory): syntax-checks every script and unit-tests the baseline-diff logic in `scripts/lib/baseline.mjs` (no network, no pi needed).
