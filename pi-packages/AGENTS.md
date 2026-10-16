# pi-packages — DUAL-PLATFORM: `pi` AND `omp`

**ALWAYS consider this when doing ANYTHING under `pi-packages/`.**

Every package in this directory is consumed by TWO runtimes:

1. **`pi`** — installed via `pi install <path|git>`, loads `extensions/`,
   `prompts/`, `skills/`, `commands/`, etc. directly.
2. **`omp`** — installed via `omp install` / `.omp-plugin/marketplace.json`,
   whose entries source `./pi-packages/<name>`. omp's loader registers
   slash commands from `commands/` only — a file in `prompts/` alone is
   NEVER a slash command on omp.

Root `AGENTS.md` has the global rules (testing before push, no over-engineering,
doc-sync principle) — this file is the pi-package part.

## Doc sync checklist — adding or modifying a package

1. Bump `pi-packages/<name>/package.json` `version`.
2. `.omp-plugin/marketplace.json` — bump the entry's `version` to match the
   package (a stale entry makes `omp plugin upgrade` install old code).
   New pi packages need an entry here.
3. Root `README.md` — "pi packages" section/table and its install snippet.
4. Root `INSTALL.md` — "pi packages" section.
5. The package's own `README.md` — install paths (`pi install`, `omp install`)
   and usage.

### omp marketplace entries (`.omp-plugin/marketplace.json`)

1. The `version` in each entry tracks the sourced `pi-packages/<name>/package.json`
   — bump both together (above). `metadata.version` bumps on its own cadence.
2. omp slash commands: `prompts/` alone NEVER registers as slash commands on
   omp (its legacy pi-package loader drops the dir). Mirror the files into
   `pi-packages/<name>/commands/` and omp registers them — verified live via
   a plain `omp install` link, no marketplace needed. The cg family lives in
   both dirs, wired as drift-sync entries in `scripts/check-drift.ts`
   (prompts/ is canonical; `dt` is NOT mirrored — the extension registers
   `/dt` itself and a file would collide).
3. Root `INSTALL.md` must cover every install path the change introduces
   (marketplace, `pi install`, `omp install`).

## Shared files between `pi-packages/` and `plugins/`

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

## Testing

pi packages with a `tests/` directory run `node --experimental-strip-types tests/*.ts`
(see the `pi-package:verify` mise task). Otherwise: `mise run pi-package:try <name>`
launches pi with the package loaded ephemerally; `mise run pi-package:verify <name>`
runs its loader smoke test + `npm pack --dry-run`.
