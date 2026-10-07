# pi-packages — DUAL-PLATFORM: `pi` AND `omp`

**ALWAYS consider this when doing ANYTHING under `pi-packages/`.**

Every package in this directory is consumed by TWO runtimes:

1. **`pi`** — installed via `pi install <path|git>`, loads `extensions/`,
   `prompts/`, `skills/`, `commands/`, etc. directly.
2. **`omp`** — installed via `omp install` / `.omp-plugin/marketplace.json`,
   whose entries source `./pi-packages/<name>`. omp's loader registers
   slash commands from `commands/` only — a file in `prompts/` alone is
   NEVER a slash command on omp.

Consequences for any change:

- **Version bump:** `package.json` `version` and the matching entry's
  `version` in `.omp-plugin/marketplace.json` bump together, always.
  A stale marketplace entry makes `omp plugin upgrade` install old code.
- **omp slash commands:** anything you want reachable as `/cmd` on omp
  must exist in `commands/` (mirror from `prompts/`; `prompts/` is
  canonical for the drift check). Exception: `dt` is NOT mirrored — the
  omp extension registers `/dt` itself and a file would collide.
- **Shared files** (`block-forbidden-git-add`, `iac-check-guard`,
  `design-thinking/references`, etc.): edit the pi-packages copy first,
  then run `bun scripts/check-drift.ts` (root of repo) before committing.
- **Platform-only files** (READMEs, LICENSEs, `hooks/hooks.json` vs
  `extensions/*.ts`, tests): edit each side independently; never sync.

Full sync classes and the doc-sync checklist live in the root
`AGENTS.md` — read it before calling a task done.