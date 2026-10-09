# block-forbidden-git-add

pi extension that blocks `git add -A` / `git add .` / `git add --all` (and the
other history-rewriting rules) before the Bash tool runs.

The logic lives in `extensions/block-forbidden-git-add.sh`, shared verbatim
with the Claude Code plugin in `plugins/block-forbidden-git-add/` — single
source of truth, two loaders.

## Blocks

- Whole-tree staging: `git add -A`, `git add --all`, `git add -u`,
  `git add --update`, `git add .`, `git add '*'`
  (also `git add -- .`, `..`, `./*`, `:/`)
- Protected paths: `CLAUDE.md`, `AGENTS.md`, `docs/`, `tmp/`, `secrets/`,
  matched per path component as globs, ignoring case, for `git add` and
  `git commit <paths>`
- History rewriting: `git revert|rebase|reset|filter-branch|filter-repo`,
  `git commit --amend`, `git push --force|-f|+refspec` (also `-uf`, `--forc`)
- Whole-tree commit: `git commit -a|-am|--all`

Commands are parsed with a quote-aware tokenizer: commit messages and heredoc
bodies never trigger a rule, and `sh -c "git ..."`, `eval`, `$(...)` wrappers
are scanned. If `jq` is missing, git commands are denied (fail closed).

## Install

```bash
pi install /absolute/path/to/pi-packages/block-forbidden-git-add

# via the omp marketplace
omp plugin marketplace add widnyana/eyay-toolkits
omp plugin install block-forbidden-git-add@eyay-toolkits
```

Note: `pi install git:...` installs the repo root, not this subdirectory — use
a local path (or publish this directory as its own npm package).

## Requirements

- `jq` on PATH (used by the check script)
- Runs wherever `bash` exists (macOS/Linux; on Windows needs a bash available to Bun)

## Per-project override

Commit a JSON file inside the project. Never under `~/.claude`.

- `<project>/.claude/block-forbidden-git-add.json`
- `<project>/.pi/block-forbidden-git-add.json` (read second, wins per key)

```json
{
  "forbidden_dirs": ["tmp", "secrets"],
  "forbidden_files": ["CLAUDE.md"],
  "forbidden_flags": ["commit --amend", "pull --rebase"]
}
```

Keys (all optional, all string arrays): `forbidden_files`, `forbidden_dirs`,
`wildcard_tokens`, `forbidden_subcommands`, `forbidden_flags`. A key that is
present REPLACES the default list; `[]` empties it. Absent keys keep defaults.

The project root is `$CLAUDE_PROJECT_DIR`, else the git toplevel of the
working directory. The file is read with `jq` and never executed. A bad file
(invalid JSON, wrong type, unknown key, symlink) fails closed: every `git`
call the guard watches is denied with a "bad config" reason until it is fixed.

A `forbidden_flags` entry ending in `$` matches exactly (default
`commit --all$` must not catch `--allow-empty`). The guard cannot protect its
own config (it only sees `Bash`): review changes to these files in the diff.

Tests: `bash tests/guard.test.sh` (default rules) and
`bash tests/override.test.sh`; set `BASH_BIN=/bin/bash` to run them on macOS
bash 3.2.
