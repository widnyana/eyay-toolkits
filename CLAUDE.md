# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

eyay-toolkits is a Claude Code **plugin marketplace**: a flat collection of independent,
self-contained plugins under `plugins/`, registered in `.claude-plugin/marketplace.json`
(schema `anthropic.com/claude-code/marketplace.schema.json`). Install via
`npx skills add widnyana/eyay-toolkits` (skills.sh).

There is no root build system, package manager, or CI — each plugin is independent and
mostly declarative (Markdown skill/agent/hook definitions). A couple of plugins carry
small scripts or a Python test suite; see below.

### Plugin anatomy

Every plugin lives at `plugins/<name>/` with a `.claude-plugin/plugin.json` manifest
(`name`, `version`, `description`, `author`, `license`, `repository`, `keywords`) plus
some subset of:

- `skills/<skill-name>/SKILL.md` — YAML frontmatter (`name`, `description`) + the skill
  body. Optional sibling dirs: `references/`, `examples/`, `scripts/`, `evals/`, `resources/`.
- `agents/*.md` — subagent definitions (only `solana-onchain` uses this).
- `hooks/hooks.json` (+ `hooks/scripts/`) — plugin-shipped Claude Code hooks, distinct
  from this repo's own dev-environment hooks in `.claude/settings.local.json`.

**Plugin versions are not synced with `marketplace.json`'s `metadata.version`** — each
plugin bumps its own `plugin.json` version independently (e.g. `perihbahasa` is at
1.2.0 while the marketplace metadata version is still 1.0.0). Don't assume they match.

### The plugins

|Plugin|Category|Notable structure|
|---|---|---|
|`block-forbidden-git-add`|safety|`hooks/hooks.json` — PreToolUse/Bash hook blocking `git add .`/`-A`, staging protected paths, and history rewrites; per-project JSON override (`.claude/` or `.pi/block-forbidden-git-add.json`).|
|`iac-check-guard`|safety|`hooks/hooks.json` — PreToolUse/Bash hook blocking IaC write/destructive commands (`ansible-playbook` without `--check`, terragrunt/tofu/terraform apply-family incl. mise-wrapped forms); shares its check script with `pi-packages/iac-check-guard`.|
|`bmad-sprint-run`|development|Skill + Python companion (`sprint-runner.py`, `lib/*.py`) that autonomously drives a BMad sprint. Has a real `pytest` suite in `tests/`.|
|`career-tools`|writing|Cover letter / CV builder skills.|
|`design-thinking`|development|`/dt` mode + `/cg*` commands: draw the Design Graph before writing code. Claude Code port of `pi-packages/design-thinking` (hooks + commands instead of extension + prompts). Has `tests/smoke.sh`.|
|`evm-decimal-validation`|blockchain|Audits hardcoded EVM decimals and FromWei/ToWei conversions.|
|`excalidraw-diagrams`|media|Skill + Python tooling that generates multi-frame `.excalidraw` scenes from a design doc: `scripts/xl.py` (builder + layout checks), `build.py`, `render.py`/`preview.sh`, `validate.py`, `crosscheck.py`. `references/` and an `examples/` frame module. Standard library only.|
|`perihbahasa`|humor|Indonesian proverb remix skill; corpus in `references/proverbs.md`, curated examples in `references/exemplars.md`, dedup tool at `scripts/merge_proverbs.py`.|
|`pi-coordinator`|development|Skill + `scripts/` (bash + `pi-run.mjs`, a Node RPC driver for `pi` workers with tool cap, loop nudge, idle watchdog and verify gate). Claude Code only (uses Monitor).|
|`prose-engineers`|writing|Technical writing / satire skills (`technical-writer`, `management-theatre`). `technical-writer` carries `references/patterns.md` (structure templates) and `references/reading-psychology.md` (scanning patterns, attention-span research).|
|`solana-onchain`|blockchain|Skills + 2 subagents (`agents/`) + a SessionStart hook checking for the `solana-onchain-mcp` binary. Defaults to devnet.|
|`sui-dev-tools`|blockchain|9 Sui/Move skills (contracts, TS SDK, dApp Kit, Seal, Walrus).|
|`ts-backend-dev`|development|TypeScript backend skills: N+1 query fixes, code review, Prisma schema design.|
|`visual-gen`|media|HTML+CSS → PNG via headless Chrome, for cover images / architecture diagrams / infographics. Has `test.sh`.|

### Testing

Only two plugins have runnable tests:

- **`bmad-sprint-run`**: `pytest plugins/bmad-sprint-run/tests` — `tests/conftest.py`
  inserts the plugin root onto `sys.path` so `import lib.*` works regardless of cwd.
  No `pyproject.toml`/`pytest.ini` — invoke pytest directly.
- **`visual-gen`**: `bash plugins/visual-gen/test.sh --check` for a free structure-only
  check; `bash plugins/visual-gen/test.sh` runs the full E2E generation via the Claude
  CLI (costs real API spend, ~$1.50/run) — don't run the full mode without asking.

Every other plugin is Markdown-only; there is nothing to lint, build, or test beyond
reading the skill/agent/hook files themselves.

### Adding or modifying a plugin

Follow `CONTRIBUTING.md`: new plugins need `.claude-plugin/plugin.json`, a `SKILL.md`
(or agent/hook equivalent), a plugin-level `README.md`, and an entry appended to
`.claude-plugin/marketplace.json`'s `plugins` array. CONTRIBUTING.md also describes a
per-plugin `package.json` / root `workspaces` array — in practice **no plugin actually
has a `package.json`**, so treat that part of CONTRIBUTING.md as aspirational, not
current convention; don't add one unless asked.

When bumping a plugin, update its own `plugin.json` version — do not expect or try to
keep `marketplace.json`'s `metadata.version` in lockstep, since the existing plugins
don't.

### Local testing and validation — MANDATORY before any push

Nothing ships to the remote without the user testing it locally first. The user
decides when to push; agents NEVER push and NEVER ask to push. The session of
2026-09-03 shipped multiple unverified pushes — do not repeat that.

- **Verify on the real surface before declaring done.** For omp extensions that
  means: restart omp, exercise the real flow (slash command, dialog click,
  notification click), and let the user confirm. A green test suite is not
  user-visible verification.
- **Heavy automated tests are the baseline**, not a substitute. Every behavior
  change to code ships with behavioral tests covering the new contract and the
  regressions it could cause (`bun test` for pi packages, `pytest` for
  bmad-sprint-run, `bash plugins/visual-gen/test.sh --check`). Run them; never
  report pass rates from memory.
- **Claims must be verified or labeled.** Untested behavior is `[INFERENCE]`
  until someone runs it. When a claim is later falsified by a live test, correct
  the record immediately — including in docs and checklists that repeated it.

### No over-engineering — MANDATORY

If the solution becomes overly complex, the design is WRONG — stop and re-plan at
the problem layer, not the implementation layer. Before adding machinery
(subprocess chains, fallback trees, platform adapters), check whether the
platform already solves the problem natively. A permission-wrapped external
binary chain lost to a single terminal escape sequence. When a simpler design
exists, the complex one is a bug, not a v1.

### Documentation sync checklist — MANDATORY

Agents working here have repeatedly finished a change while leaving the root docs stale.
Before you call ANY task that adds, renames, or materially changes a plugin or pi package
**done**, go through this checklist. Every applicable line, every time — no silent skips.

**Adding or modifying a plugin (`plugins/<name>/`):**

1. Bump `plugins/<name>/.claude-plugin/plugin.json` `version` — any functional change
   (new/changed skill, command, hook, script). Feature → minor, fix → patch.
2. Root `README.md` — "The plugins" table: add a row (new plugin) or update the
   description if its summary is no longer accurate.
3. Root `INSTALL.md` — plugin install list: add `/plugin install <name>@eyay-toolkits`
   for new plugins.
4. `CLAUDE.md` — "The plugins" table above: add/update the row.
5. The plugin's own `README.md` — install command, usage, and examples still accurate.

**Adding or modifying a pi package (`pi-packages/<name>/`):**


1. Bump `pi-packages/<name>/package.json` `version`.
2. `.omp-plugin/marketplace.json` — bump the entry's `version` to match the
   package (omp resolves this marketplace from the same `pi-packages/` source;
   a stale entry makes `omp plugin upgrade` install the old code). New pi
   packages need an entry here.
3. Root `README.md` — "pi packages" section/table and its install snippet.
4. Root `INSTALL.md` — "pi packages" section.
5. The package's own `README.md` — install paths (`pi install`, `omp install`)
   and usage.

**Adding or modifying an omp marketplace plugin (`.omp-plugin/marketplace.json`):**

1. The `version` in each entry tracks the sourced `pi-packages/<name>/package.json`
   — bump both together (see above). `metadata.version` bumps on its own cadence.
2. omp slash commands: `prompts/` alone NEVER registers as slash commands on
   omp (its legacy pi-package loader drops the dir). Mirror the files into
   `pi-packages/<name>/commands/` and omp registers them — verified live via
   a plain `omp install` link, no marketplace needed. The cg family lives in
   both dirs, wired as drift-sync entries in `scripts/check-drift.ts`
   (prompts/ is canonical; `dt` is NOT mirrored — the extension registers
   `/dt` itself and a file would collide).
- `.omp-plugin/marketplace.json` — keep entry `version` in sync with the
  sourced `pi-packages/<name>/package.json`; see the omp checklist above.
- Root `INSTALL.md` must cover every install path the change introduces
  (marketplace, `pi install`, `omp install`).

If a line genuinely doesn't apply, state why in one line instead of skipping silently.
If a doc is out of scope for the task (e.g. user said stop), list it explicitly as a
follow-up in your final message — never drop it on the floor.

### Shared files between `plugins/` and `pi-packages/`

Some files exist in both trees. Canonical source is `pi-packages/<name>/`;
`bun scripts/check-drift.ts` syncs them into `plugins/<name>/` and
`bun scripts/check-drift.ts --check` verifies no drift (runs as a git
pre-commit hook — reinstall it with the snippet in `docs/plans/` if `.git/hooks`
is ever reinitialized). Classes:

- **sync (verbatim):** `block-forbidden-git-add` and `iac-check-guard` hook scripts
  (`extensions/*.sh` → `hooks/scripts/*.sh`); `design-thinking/references/*.md`.
- **transform:** `design-thinking/skills/*/SKILL.md` — "package" is
  mechanically replaced with "plugin" when written to `plugins/`.
- **excluded (per-platform by design):** READMEs, LICENSEs, adapters
  (`hooks/hooks.json` vs `extensions/*.ts`), pi-only `prompts/`/`extensions/`
  and tests. Edit each side independently; never sync.

Rule: edit the pi-packages copy first, then run `bun scripts/check-drift.ts`
before committing. If a shared edit belongs only to one platform, move the
file to the excluded class in `scripts/check-drift.ts` instead of weakening
the check.
If a line genuinely doesn't apply, state why in one line instead of skipping silently.
If a doc is out of scope for the task (e.g. user said stop), list it explicitly as a
follow-up in your final message — never drop it on the floor.

---
