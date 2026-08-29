# block-forbidden-git-add

pi extension that blocks `git add -A` / `git add .` / `git add --all` (and the
other history-rewriting rules) before the Bash tool runs.

The logic lives in `extensions/block-forbidden-git-add.sh`, shared verbatim
with the Claude Code plugin in `plugins/block-forbidden-git-add/` — single
source of truth, two loaders.

## Blocks

- Whole-tree staging: `git add -A`, `git add --all`, `git add -u`,
  `git add --update`, `git add .`, `git add '*'`
- Protected paths: `CLAUDE.md`, `AGENTS.md`, `docs/`, `tmp/`, `secrets/`
- History rewriting: `git revert|rebase|reset|filter-branch|filter-repo`,
  `git commit --amend`, `git push --force|-f`

## Install

```bash
pi install /absolute/path/to/pi-packages/block-forbidden-git-add
```

Note: `pi install git:...` installs the repo root, not this subdirectory — use
a local path (or publish this directory as its own npm package).

## Requirements

- `jq` on PATH (used by the check script)
- Runs wherever `bash` exists (macOS/Linux; on Windows needs a bash available to Bun)

## Edit rules

Edit the `FORBIDDEN_*` arrays at the top of
`extensions/block-forbidden-git-add.sh` and mirror them in the Claude plugin
script if they must stay in sync.
