---
name: pi-coordinator
description: Run as coordinator that plans a job, hands each coding task to a sub-agent worker (pi Agent tool / omp task agent), verifies every result itself, and lands passing work on local main as one squash commit per task. Use this whenever the user says "use pi", "spawn pi workers", "be the coordinator", "fan out workers", wants many small code changes done by cheap parallel agents, or wants a sweep or migration split into worker-sized tasks, even if they do not name the skill.
---

# pi-coordinator

`<skill-dir>` below is this skill's base directory.

You plan, delegate, watch, verify and land. The worker sub-agents type the code. You never trust a worker's own "pass" report: you re-run the checks. The user keeps you as manager, so do not finish a worker's task yourself; send it back with a sharper prompt.

Why this shape: a cheap model is slow and ceremonial. In past runs it spent 30 to 60 tool calls on 2 line fixes, looped on one read, reported "tests pass" when they failed, and left files uncommitted. The fixes are all structural: tiny tasks, exact edits in the prompt, a verify gate you own, and one squash land per task. Workers run via the runtime's sub-agent mechanism — on pi the `Agent` tool (`@tintinweb/pi-subagents`) with the shipped `pi-coordinator-worker` agent type; on omp the native task sub-agent with the same prompt. No RPC driver, no monitor scripts: background agents report back as completion notifications, and progress is visible in the sub-agent UI (FleetView on pi, the sub-agents panel on omp).

## Workflow

0. **Baseline and pre-flight (mandatory).** The single biggest time sink is a dirty baseline: run the job's verify command on main (the base ref) **once before spawning** and record the pre-existing failure/lint set. The gate is then **no new failures vs baseline**, not green — otherwise every gate looks red and you end up hand-diffing failures. Scope the gate to the change: lint only changed files (mirror the repo's own convention, e.g. lint-staged), run task-specific tests (`go test -run <task's tests>`), never the whole suite per worker. Then pre-flight the environment **once per job**: toolchain resolvable from a fresh worktree (tsc, cargo), DB reachable, and seed shared infra once — warm `node_modules`, a shared `CARGO_TARGET_DIR`, one throwaway Postgres with a fresh-DB verify wrapper — so no worker pays cold-install/cold-build cost.
1. **Break down.** Write the plan (project convention: plan file under `docs/plans/`). One task = one worktree = one squash commit. Aim for 1 to 3 files per task. Tasks that touch the same files run in sequence; disjoint ones run in parallel (2 to 3 at a time is plenty for Rust builds).
2. **Extract facts yourself.** Grep, run the codegraph or a script, read the code. Put exact file paths, line hints, old text and new text into the prompt. The worker should edit, not discover.
3. **Create one worktree per task** (you own it, not the runtime):
   `git worktree add .worktrees/<prefix>/pi-<unit> -b <prefix>/pi-<unit> main`
   Before relying on the primary checkout, check `git status` there and `ps` for other agent sessions; the squash in step 7 runs there and must not collide with someone's uncommitted edits.
4. **Write one prompt file per task** to `$PI_WORK/<unit>.txt` (default `$TMPDIR/pi-work`). Use the Write tool, not a shell heredoc, when the prompt mentions commands a git guard blocks. Use `references/prompt-template.md`. The prompt must state the absolute worktree path. Append the project's forbidden-phrase line if the user gave one.
5. **Spawn one worker per task** (2–3 concurrent max). Never spawn without a defined verify command — if the project has no checks, say so and get the user's confirmation first. On pi:
   `Agent({ subagent_type: "pi-coordinator-worker", prompt: <full prompt file text>, description: "<unit>", run_in_background: true })`
   — pass `model: "<model>"` only when the user named one for this job; otherwise leave it (agent default = inherit).
   On omp, use the native task sub-agent with the same prompt text if `pi-coordinator-worker` is not registered. A follow-up in the same worktree is a **resume/steer** of the same agent (keeps its context), or a fresh spawn with the same worktree path — not a new worktree. A feature that must land atomically (schema change plus every writer plus tests) is one worktree with several worker runs, landed once with `SUBJ=... BODY=...` on `land.sh`.
   Workers inherit the project's pi/omp extensions by default (the worker agent sets `extensions: true`) — so a project git guard (e.g. `block-forbidden-git-add`) blocks stage-all **structurally**, not just via prompt text. That is deliberate: keep it on. To slim a worker for a specific project, override with `exclude_extensions` in a project-local agent file; never strip the guard.
6. **Gate each result yourself** when the completion notification arrives (do not rely on the worker's last message). Record the outcome explicitly — `verified | verify-failed (round n) | abandoned` — so a half-gated result is never mistaken for a pass:
   - `git status --short` in the worktree: nothing uncommitted. Verify the commit, not the dirty tree.
   - `git --no-pager diff main...<branch>`: only expected files, no generated or forbidden paths.
   - Run the project's real checks in the worktree (extract the verification stack from the project's CLAUDE.md/AGENTS.md **once per job**), scoped per step 0, and judge **against the baseline failure set: a worker gate fails only on new failures**. Frontend: type check with 0 new errors plus the task's tests. Rust: fmt, clippy exactly as the repo hook does, `cargo check --tests`, the task's unit tests, integration tests on the pre-provisioned DB. Read the diff, not just the checks: workers have buried changes where the guard no longer applies.
   - A worker's final message can be noise or claim a commit it never made. Trust `git status` and `git log main..HEAD` in the worktree only.
   - **On gate failure:** resume the same worker (steer it while it runs) with the last 40 lines of the failing output quoted verbatim and the exact fix, up to 2 rounds. Still red → abandon: write a new prompt with the failure quoted, split the task if it was too big, and spawn fresh.
   - Plain `cargo fmt` reformats files the task never touched when main is not fmt-clean. Tell workers `rustfmt --edition 2024 <changed files>`, and `git restore` stray files before landing.
   - After several lands that touch the same files, run one combined gate on a detached worktree of the new main: the fixes were only verified one by one.
7. **Land.** `VERIFY_CMD='<your checks>' <skill-dir>/scripts/land.sh <unit> [prefix]` — it re-runs the checks (set `VERIFY_CMD` to skip nothing; omit it only when you already verified this exact HEAD in step 6), refuses a dirty worktree, pre-checks the merge with `git merge-tree --write-tree`, squash merges onto local main with the worker's first commit message, removes worktree and branch. **Land immediately after a worker passes** — main advances and the next worker branches from green main instead of piling up on stale branches. Linear history, no merge commits, never push unless the user's wrap up line says so. If the primary checkout has another session's uncommitted edits in a file your branch touches, git refuses and nothing changes: never stash, restore or overwrite that session's files, and never move the main ref behind its back — ask the user who commits those files.
8. **Report** in the user's reply style: what landed (hashes), what is open, the one thing the user must do.

## When a worker fails

- Gate still red after the send-backs, or wrong behavior: write a new prompt that quotes the exact failing output and the exact fix, and spawn it into the same worktree.
- Looped, stalled, or hit the turn cap: the task was too big or the prompt too vague. Split it and give exact edits.
- Changed behavior it was not asked to change: send it back with the original behavior stated as a rule.
- Left a follow-up uncommitted: land a follow-up commit through a worker; `land.sh` refuses dirty worktrees.
- Changed the wrong thing and the worktree is a mess: `git worktree remove --force` and start the unit over. Never try to hand-patch a worker's tree yourself.

## When NOT to delegate

Reserve workers for many similar edits or genuinely parallel disjoint changes. For a new-from-scratch file you must specify near-complete content in the prompt anyway — the worker would only type + commit + run the gate, no leverage against the worktree/cold-build overhead. In that case write it yourself (or on main directly) and skip the machinery.

## Defaults and rules

- Model: left to the worker agent's default (inherit from the session) unless the user names one in their request — in that case pass `model` to every `Agent` call in the job. Keep it everywhere if the user said so.
- Rules to put in every worker prompt: do not explore, read only named files, `grep -n` then a 30 line window, never read the same range twice, one `edit` call per file with all its changes, no checks (the coordinator runs them), hard tool cap, no narration, exact final message format, commit by explicit file path in the project's commit style, no co-author line if the user forbids it.
- Never edit generated files; use the project's codegen. Never use stage-all commands; stage by explicit path.
- Docs may be hook blocked from staging: write them and tell the user to stage.
- Where the backend looks wrong or the intent is unclear, report it to the user instead of fixing it.
- Keep your own messages short; progress belongs in the sub-agent UI, not in your replies.

## Files

- `agents/pi-coordinator-worker.md`: the shipped worker subagent definition (pi: registered via the package manifest's `pi.subagents` — `pi install` is the whole setup; omp: use the bundled task agent).
- `scripts/land.sh`: coordinator-side gate + landing (refuse dirty, merge-tree pre-check, squash onto main, remove worktree and branch).
- `references/prompt-template.md`: worker prompt skeleton and sizing rules.
- The Claude Code twin of this skill drives the same workflow over `pi --mode rpc` in `plugins/pi-coordinator/`; the RPC driver scripts do not exist here — sub-agents replace them.
