# plugins/

Rules for anything under `plugins/`. Root `AGENTS.md` has the global rules (testing
before push, no over-engineering, doc-sync principle) — this file is the plugin part.

## Plugin anatomy

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

**Shared files with `pi-packages/`:** some files exist in both trees (hook scripts,
design-thinking references/skills). Canonical source is `pi-packages/<name>/`; edit
that copy first, then run `bun scripts/check-drift.ts` before committing. See
`pi-packages/AGENTS.md` for the sync classes.

## The plugins

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
|`pi-coordinator`|development|Skill + `scripts/` (bash + `pi-run.mjs`, a Node RPC driver for `pi` workers with tool cap, loop nudge, idle watchdog and a baseline-aware verify gate — fails only on failures new vs the base ref; human-only `tail.sh` for live QA). Claude Code only (uses Monitor). Has `test.sh` (script syntax + baseline-diff unit tests).|
|`prose-engineers`|writing|Technical writing / satire skills (`technical-writer`, `management-theatre`). `technical-writer` carries `references/patterns.md` (structure templates) and `references/reading-psychology.md` (scanning patterns, attention-span research).|
|`solana-onchain`|blockchain|Skills + 2 subagents (`agents/`) + a SessionStart hook checking for the `solana-onchain-mcp` binary. Defaults to devnet.|
|`sui-dev-tools`|blockchain|9 Sui/Move skills (contracts, TS SDK, dApp Kit, Seal, Walrus).|
|`ts-backend-dev`|development|TypeScript backend skills: N+1 query fixes, code review, Prisma schema design.|
|`visual-gen`|media|HTML+CSS → PNG via headless Chrome, for cover images / architecture diagrams / infographics. Has `test.sh`.|

## Testing

Three plugins have runnable tests:

- **`bmad-sprint-run`**: `pytest plugins/bmad-sprint-run/tests` — `tests/conftest.py`
  inserts the plugin root onto `sys.path` so `import lib.*` works regardless of cwd.
  No `pyproject.toml`/`pytest.ini` — invoke pytest directly.
- **`pi-coordinator`**: `bash plugins/pi-coordinator/skills/pi-coordinator/test.sh` —
  bash syntax-checks every script and unit-tests the baseline-diff logic in
  `scripts/lib/baseline.mjs` (no network, no pi needed).
- **`visual-gen`**: `bash plugins/visual-gen/test.sh --check` for a free structure-only
  check; `bash plugins/visual-gen/test.sh` runs the full E2E generation via the Claude
  CLI (costs real API spend, ~$1.50/run) — don't run the full mode without asking.

Every other plugin is Markdown-only; there is nothing to lint, build, or test beyond
reading the skill/agent/hook files themselves.

## Adding or modifying a plugin — doc sync checklist

Follow `CONTRIBUTING.md`: new plugins need `.claude-plugin/plugin.json`, a `SKILL.md`
(or agent/hook equivalent), a plugin-level `README.md`, and an entry appended to
`.claude-plugin/marketplace.json`'s `plugins` array. CONTRIBUTING.md also describes a
per-plugin `package.json` / root `workspaces` array — in practice **no plugin actually
has a `package.json`**, so treat that part of CONTRIBUTING.md as aspirational, not
current convention; don't add one unless asked.

When bumping a plugin, update its own `plugin.json` version — do not expect or try to
keep `marketplace.json`'s `metadata.version` in lockstep, since the existing plugins
don't.

Then walk this checklist (every applicable line, every time):

1. Bump `plugins/<name>/.claude-plugin/plugin.json` `version` — any functional change
   (new/changed skill, command, hook, script). Feature → minor, fix → patch.
2. Root `README.md` — "The plugins" table: add a row (new plugin) or update the
   description if its summary is no longer accurate.
3. Root `INSTALL.md` — plugin install list: add `/plugin install <name>@eyay-toolkits`
   for new plugins.
4. This file — "The plugins" table: add/update the row.
5. The plugin's own `README.md` — install command, usage, and examples still accurate.
