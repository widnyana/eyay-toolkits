---
name: pi-coordinator
description: Run as coordinator that plans a job, hands each coding task to a separate `pi` worker over its RPC mode, watches the workers with a Monitor, verifies every result itself, and lands passing work on local main as one squash commit per task. Use this whenever the user says "use pi", "spawn pi", "delegate to pi", "be the coordinator", "fan out workers", wants many small code changes done by cheap parallel agents, or wants a sweep or migration split into worker-sized tasks, even if they do not name the skill.
---

# pi-coordinator

`<skill-dir>` below is this skill's base directory.

You plan, delegate, watch, verify and land. The `pi` workers type the code. You never trust a worker's own "pass" report: you re-run the checks. The user keeps you as manager, so do not finish a worker's task yourself; send it back with a sharper prompt.

Why this shape: a cheap model (as configured in `~/.pi/agent/settings.json` under `defaultModel`) is slow and ceremonial. In past runs it spent 30 to 60 tool calls on 2 line fixes, looped on one read, hung mid output, reported "tests pass" when they failed, and left files uncommitted. The fixes are all structural: tiny tasks, exact edits in the prompt, a driver that enforces a tool cap and kills loops and stalls, a monitor, and a verify gate you own.

## Workflow

1. **Break down.** Write the plan (project convention: plan file under `docs/plans/`). One task = one worktree = one squash commit. Aim for 1 to 3 files per task. Tasks that touch the same files run in sequence; disjoint ones run in parallel (2 to 3 at a time is plenty for Rust builds).
2. **Extract facts yourself.** Grep, run the codegraph or a script, read the code. Put exact file paths, line hints, old text and new text into the prompt. The worker should edit, not discover.
3. **Write one prompt file per task** to `$PI_WORK/<unit>.txt` (default `$TMPDIR/pi-work`). Use the Write tool, not a shell heredoc, when the prompt mentions commands a git guard blocks. Use `references/prompt-template.md`. Append the project's forbidden-phrase line to every prompt if the user gave one.
4. **Launch in the background**, one per task:
   `PI_VERIFY_CMD='<checks>' nohup <skill-dir>/scripts/launch.sh <unit> > $PI_WORK/run-<unit>.log 2>&1 &`
   It creates `.worktrees/<prefix>/pi-<unit>` from main and runs `scripts/pi-run.mjs`, which drives `pi --mode rpc --no-session` (plus `--model <model>` only when one is set) over JSONL (send `prompt`, wait for `agent_settled`, read `get_last_assistant_text`). The driver enforces `MAXTOOLS` (default 60: abort, then ask for a 4 line wrap up), nudges once or twice when any earlier tool call is repeated a third time (workers re-read ranges out of order), and ends a worker silent for 6 minutes.
   **Driver gate (the main speed lever).** With `PI_VERIFY_CMD` set, the worker only edits and commits. On each settle the driver itself checks a clean tree, a commit on `PI_BASE..HEAD` (default `main`), then runs `PI_VERIFY_CMD` in the worktree. A failure goes back to the same pi session with the last 40 lines (up to `PI_VERIFY_ROUNDS`, default 2), so the worker keeps its context and you skip a round trip. Pass writes `out-<unit>/verify.ok` (verified HEAD sha) and `verify.log`; exit 4 means still failing after all rounds. Every tool call is one LLM turn (10 to 25 s on the default model), so a worker that runs its own checks costs 2 to 3 turns plus the run, and you ran them again anyway. Put the install step in `PI_VERIFY_CMD` too. Confirm `MAXTOOLS` is really set: an earlier run launched without it and nothing capped the workers.
   Workers run **slim** by default (`scripts/slim-args.sh`, passed through `PI_EXTRA_ARGS`): no pi packages except the git guard, no skills, no prompt templates, no context files, thinking off. A full pi loads every installed package (design-thinking, sub-agents, web access, codegraph) and the global AGENTS/CLAUDE files: bigger prompts every turn, ceremony, and once a worker spawned its own "test-fix agent". The prompt must therefore carry every rule (commit style, forbidden git commands, no co-author line). Raise `PI_THINKING=low` only for a task that needs reasoning.
   Follow-ups and multi-part features: `nohup scripts/continue.sh <unit> <prompt-name> [prefix] &` runs another worker in the existing worktree (same `out-<unit>`, so the same Monitor command works). A feature that must land atomically (schema change plus every writer plus tests) is one worktree with several worker runs, landed once with `SUBJ=... BODY=...` on `land.sh`.
   Parallelize disjoint parts of one feature: branch a second worktree from the feature branch (`git worktree add .worktrees/<prefix>/pi-<unit>-fe -b <prefix>/pi-<unit>-fe <prefix>/pi-<unit>`), run the frontend part there while the Rust part runs in the first, then cherry-pick its commits onto the feature branch. Cargo builds share `CARGO_TARGET_DIR` (one target dir for all workers saves full rebuilds; builds take turns on its lock, which shows as idle time).
5. **Start the Monitor in the same turn as the launch.** Never launch workers without it; the user wants to see progress.
   Monitor command: `<skill-dir>/scripts/monitor.sh <unit> <unit>...` with `timeout_ms: 1800000`; re-arm on expiry while workers still run. It polls every 10 s, prints `DONE` with the head of the result as soon as a worker ends, and tool count and idle seconds per worker every 90 s. For human eyes only (quality check, not for agents), `<skill-dir>/scripts/tail.sh <unit>...` follows the worker's raw stream live: streaming assistant text, tool calls, errors, and the final result. `events.jsonl` lines carry `"t"` (ms): use them to see where a slow run spent its time. Long idle is normal while `cargo` compiles; check `ps` before calling it a hang.
6. **Gate each result yourself** (do not rely on the worker's last message):
   - `git status --short` in the worktree: nothing uncommitted. Verify the commit, not the dirty tree.
   - `git --no-pager diff main...<branch>`: only expected files, no generated or forbidden paths.
   - Run the project's real checks (project CLAUDE.md verification stack). Frontend: type check with 0 errors plus tests. Rust: fmt, clippy, `cargo check --tests`, unit tests, integration tests on a private database. When `out-<unit>/verify.ok` equals the worktree HEAD, the driver already ran them (trusted code, not the worker's claim): read `verify.log` instead of re-running. Checks outside `PI_VERIFY_CMD` (e.g. integration tests on a private DB) you still run.
   - Run clippy exactly as the repo hook does (bliss: lib only, no `--tests`; test code has many pre-existing `expect` hits). Read the diff, not just the checks: one worker put a new item between `#[allow(...)]` and the fn it guarded; tests passed, clippy failed.
   - A worker's final message can be noise ("waiting for the test-fix agent") or claim a commit it never made. Trust `git status` and `git log main..HEAD` in the worktree only.
   - Plain `cargo fmt` (and `rustfmt` on a test file, through `mod common`) reformats files the task never touched when main is not fmt-clean. Tell workers `rustfmt --edition 2024 <changed files>`, and `git restore` stray files before landing.
   - After several lands that touch the same files, run one combined gate on a detached worktree of the new main: the fixes were only verified one by one.
7. **Land.** `VERIFY_CMD='<your checks>' <skill-dir>/scripts/land.sh <unit>`: refuses a dirty worktree, runs the checks (skipped when `verify.ok` matches HEAD), pre-checks the merge with `git merge-tree --write-tree`, squash merges onto local main with the worker's first commit message, removes worktree and branch. Linear history, no merge commits, never push unless the user's wrap up line says so. If it fails, send the worker a new prompt (see below); do not patch it yourself.
   The squash runs in the primary checkout. If another session has uncommitted edits there in a file your branch touches, git refuses ("local changes would be overwritten") and nothing changes. Never stash, restore or overwrite that session's files, and never move the main ref behind its back (its stale index would revert your work on its next commit). Before relying on the primary tree, check `git status` there and `ps` for other agent sessions; ask the user who commits those files.
8. **Report** in the user's reply style: what landed (hashes), what is open, the one thing the user must do.

## When a worker fails

- Exit 4 (gate still red after the send-backs) or wrong behavior: write a new prompt that quotes the exact failing output (`verify.log`) and the exact fix, and run it with `continue.sh`.
- Looped, stalled or capped: the task was too big or the prompt too vague. Split it and give exact edits.
- Changed behavior it was not asked to change: send it back with the original behavior stated as a rule.
- Left a follow-up uncommitted: land a follow-up commit through a worker. `land.sh` already refuses dirty worktrees.

## Defaults and rules

- Model: left to `pi`'s own configured default (`~/.pi/agent/settings.json`, or a repo-local `.pi/settings.json` override) unless the user names one in their request — in that case, export `PI_MODEL=<model>` before running `launch.sh`/`continue.sh` so every worker in the job uses it. Keep it everywhere if the user said so.
- Rules to put in every worker prompt: do not explore, read only named files, `grep -n` then a 30 line window, never read the same range twice, one `edit` call per file with all its changes, no checks when gated, hard tool cap, no narration, exact final message format, commit by explicit file path in the project's commit style, no co-author line if the user forbids it.
- Never edit generated files; use the project's codegen. Never use stage-all commands; stage by explicit path.
- Docs may be hook blocked from staging: write them and tell the user to stage.
- Where the backend looks wrong or the intent is unclear, report it to the user instead of fixing it.
- Keep your own messages short; progress belongs in the Monitor.

## Files

- `scripts/pi-run.mjs`: one RPC worker run (tool cap, loop nudge, idle watchdog, driver gate). Exit 0 settled (and verified when gated), 1 error, 2 timeout, 3 stalled, 4 verify failed.
- `scripts/launch.sh`, `scripts/monitor.sh`, `scripts/land.sh`: launch, watch, land.
- `scripts/tail.sh`: human-only live output (`tail -f` of events.jsonl, pretty printed); agents keep using monitor.sh.
- `scripts/continue.sh`: another worker run in an existing worktree (follow-ups, multi-part features).
- `scripts/slim-args.sh`: default slim worker flags (sourced by launch/continue; override with `PI_EXTRA_ARGS`, `PI_THINKING`, `PI_GUARD_EXT`).
- `references/prompt-template.md`: worker prompt skeleton and sizing rules.
- The bliss repo keeps an IPC specific variant in `tools/ipc-alignment/`.
