# pi-coordinator

pi / omp skill for running a **coordinator**: you plan a job, hand each coding task to a sub-agent worker, verify every result yourself, and land passing work on local main as one squash commit per task. The Claude Code twin (RPC driver over `pi --mode rpc`) lives in [`plugins/pi-coordinator/`](../../plugins/pi-coordinator/); this package is the native pi/omp port — **workers are sub-agents, no RPC**.

- **pi**: workers spawn through the `Agent` tool ([@tintinweb/pi-subagents](https://github.com/tintinweb/pi-subagents)) as the shipped `pi-coordinator-worker` agent type. `pi install` is the whole setup — the agent registers via the package manifest's `pi.subagents` key.
- **omp**: workers spawn through omp's native task sub-agent with the same prompt template. [INFERENCE] Whether omp's package loader also registers the shipped agent file is unverified; the skill falls back to the bundled task agent, which behaves the same.

## Install

```bash
pi install /path/to/eyay-toolkits/pi-packages/pi-coordinator
# or from npm once published:
pi install npm:@widnyana/pi-coordinator
# or via omp:
omp install /path/to/eyay-toolkits/pi-packages/pi-coordinator
```

Peer requirement: pi needs `@tintinweb/pi-subagents` installed (provides the `Agent` tool and reads `pi.subagents`). omp has sub-agents built in.

## Usage

Invoke the coordinator skill whenever you want work fanned out: "be the coordinator", "spawn pi workers", "split this migration into worker tasks". The skill drives:

1. **Plan** — one task = one worktree = one squash commit; 1–3 files per task.
2. **Extract facts** — the coordinator greps and reads; the worker edits, it does not discover.
3. **One worktree per task**, created by the coordinator: `git worktree add .worktrees/<prefix>/pi-<unit> -b <prefix>/pi-<unit> main`.
4. **Spawn workers** — 2–3 concurrent, background, each with a prompt built from [`references/prompt-template.md`](skills/pi-coordinator/references/prompt-template.md) (exact edits, no exploration, hard tool cap, exact final-message format).
5. **Gate every result yourself** — `git status`, diff review, and the project's real check commands run in the worktree. Gate is **no new failures vs the baseline** captured on main before spawning (step 0); never trust the worker's "pass" message; on failure, resume/steer the same worker with the last 40 lines (≤2 rounds).
6. **Land** — `land.sh <unit>` refuses a dirty worktree, pre-checks the merge with `git merge-tree`, squash merges onto local main with the worker's first commit message, removes worktree and branch. Linear history, never pushes.
7. **Report** — what landed (hashes), what is open, the one thing the user must do.

## Files

| Path | Purpose |
|---|---|
| `skills/pi-coordinator/SKILL.md` | the coordinator skill (workflow, gating, failure handling) |
| `skills/pi-coordinator/scripts/land.sh` | coordinator-side squash landing (pure git surgery) |
| `skills/pi-coordinator/references/prompt-template.md` | worker prompt skeleton + sizing rules |
| `agents/pi-coordinator-worker.md` | shipped worker subagent (slim: no exploration, no narration, turn-capped) |
| `tests/land.test.ts` | smoke test — runs `land.sh` against scratch git repos (happy, dirty, conflict, verify-fail) |

## What replaced the RPC driver

| plugin (Claude Code) | this package (pi / omp) |
|---|---|
| `launch.sh` + `pi-run.mjs` (RPC JSONL) | `Agent` tool / native task sub-agent, background |
| driver verify gate + `verify.ok` handshake | coordinator runs the checks in the worktree, resumes the worker on failure |
| `monitor.sh` / `tail.sh` | sub-agent UI (FleetView / sub-agents panel) and completion notifications |
| `slim-args.sh` | worker agent frontmatter (`tools`, `thinking: off`, `max_turns`) |
| `continue.sh` | resume/steer the same agent, or a fresh spawn into the same worktree |
| `land.sh` | kept (slimmed) — git is the same on both sides |

## Test

```bash
mise run pi-package:verify pi-coordinator   # runs tests/land.test.ts + npm pack --dry-run
mise run pi-package:try pi-coordinator      # launch pi with the package loaded
```
