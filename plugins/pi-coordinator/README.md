# pi-coordinator

Claude Code acts as coordinator: it plans a job, hands each small coding task to a separate [`pi`](https://github.com/badlogic/pi-mono) worker over its RPC mode, watches the workers, and lands passing work on local `main` as one squash commit per task. Built for cheap, slow models (default `openrouter/z-ai/glm-5.3-flash`).

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
3. Watches with `scripts/monitor.sh <unit>...` (DONE within 10 s, status every 90 s).
4. Lands with `scripts/land.sh <unit>` (squash, remove worktree and branch, never push).

## What makes it fast

- Driver gate: with `PI_VERIFY_CMD` set, the worker only edits and commits. The driver (`scripts/pi-run.mjs`) checks a clean tree and a commit, runs the checks, and sends failures back to the same pi session (`PI_VERIFY_ROUNDS`, default 2). `land.sh` skips its own re-run when `verify.ok` matches HEAD.
- Tool cap (`MAXTOOLS`), a nudge when any tool call repeats a third time, and a 6 minute idle watchdog.
- Slim workers (`scripts/slim-args.sh`): no pi packages, skills or context files, thinking off; only the `block-forbidden-git-add` guard extension (set `PI_GUARD_EXT` when it is not in this repo checkout).
- `events.jsonl` lines carry a `t` timestamp, so slow runs can be measured.

Exit codes of `pi-run.mjs`: 0 settled (and verified when gated), 1 error, 2 timeout, 3 stalled, 4 verify failed.
