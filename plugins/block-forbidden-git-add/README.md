# block-forbidden-git-add

A Claude Code **PreToolUse** hook for the `Bash` tool. It inspects every
`git` command Claude is about to run and **denies** any that would stage a
protected path, stage the whole tree, or rewrite history. It is silent
(exit 0, no JSON) on everything else — so non-git commands and safe git
commands are never disturbed.

## Install

Enable this plugin (`/plugin install block-forbidden-git-add` or via
`npx skills add widnyana/eyay-toolkits`) and the hook registers itself
automatically as a `PreToolUse` hook — no `settings.json` editing required.
Requires `jq` on `PATH` (used to read the payload and emit the verdict).

The hook reads the JSON payload Claude sends on stdin and emits a JSON verdict
on stdout. `deny` = block the command and show the reason to the model;
silence = allow.

## Configuration (single source of truth, top of the script)

| Variable | Default | Meaning |
|---|---|---|
| `FORBIDDEN_FILES` | `CLAUDE.md AGENTS.md` | Protected files, matched by basename anywhere in the path. |
| `FORBIDDEN_DIRS` | `docs tmp secrets` | Protected directories, matched as any path component. |
| `WILDCARD_TOKENS` | `-A --all -u --update . *` | Tokens that make `git add` a whole-tree stage. |
| `FORBIDDEN_SUBCOMMANDS` | `revert rebase reset filter-branch filter-repo` | History-rewriting / state-rolling subcommands. |
| `FORBIDDEN_FLAGS` | `commit --amend`, `commit -a`, `commit --all$`, `push --force`, `push -f`, `push +` | `"<subcommand> <flag>"` pairs. Matches the exact flag, the flag plus a suffix (`--force-with-lease`), a short-flag cluster (`-uf`, `-am`), a long-flag abbreviation (`--forc`), or a `+refspec`. A trailing `$` means exact match only (so `--allow-empty` is not caught by `commit --all$`). |
| `MONITORED` | `add commit push` + the forbidden subcommands and flag subcommands | Subcommands the hook analyzes; others are ignored. |

### Per-project override

Do not edit the plugin script. Commit a JSON file inside the project (never
under `~/.claude`):

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

The guard cannot protect its own config: it only sees `Bash`, and the file is
a normal committed file, so an agent can edit it with a file write. Review
changes to these files in the diff or PR.

The project root is `$CLAUDE_PROJECT_DIR`, else the git toplevel of the
working directory. The file is read with `jq` and never executed. A bad file
(invalid JSON, wrong type, unknown key, symlink) fails closed: every `git`
call the guard watches is denied with a "bad config" reason until it is fixed.

## What it blocks

### 1. Whole-tree `git add`
Any `git add` containing a wildcard token (`-A`, `--all`, `-u`, `--update`,
`.`, `*`) is denied, because it could sweep protected paths into the index.

```
git add .          -> DENY
git add -A         -> DENY
git add --all      -> DENY
git add *          -> DENY
```

Also denied: `git add -- .`, `git add ..`, `git add ./*`, `git add :/`, and
clustered or abbreviated flags (`-fA`, `--al`).

This is **cwd-blind by design**: `git add .` is denied even from a subdir,
because `.` from inside `docs/` would be exactly the protected case. Safe
over-blocking.

### 2. Staging a protected path (path normalization)
Each path component is matched against the protected names, **as a glob and
without regard to case** (macOS and Windows file systems ignore case). A path
is blocked if any component matches a protected dir, or the last component
matches a protected file. Quotes, escaped spaces, `./`, `:/` pathspecs and
trailing `/` are handled. The same check runs on `git commit <paths>`. This
catches relative, absolute, parent-relative, quoted and globbed forms alike:

```
git add docs/plan.md                  -> DENY  (docs/ protected)
git add ./docs/loki/README.md         -> DENY
git add /Users/wid/x/docs/README.md   -> DENY  (absolute path)
git add ../docs/README.md             -> DENY  (parent-relative)
git add 'docs/README.md'              -> DENY  (quoted)
git add sub/AGENTS.md                 -> DENY  (AGENTS.md basename)
git add "docs/my file.md"             -> DENY  (quoted, with a space)
git add Docs/x.md  /  git add claude.md -> DENY (case-insensitive)
git add d*  /  git add src/*          -> DENY  (glob can reach docs/)
git add src/*.ts                      -> pass
git add charts/app/values.yaml        -> pass  (safe path)
```

Globs are matched against protected names, so `git add src/*` is denied even
if `src/docs` does not exist. Stage explicit paths instead.

**All-or-nothing:** PreToolUse can only allow or deny the *entire* command,
not individual arguments. A multi-path add is denied wholesale on the first
protected hit, even if some paths are safe. Re-run with only the safe paths:

```
git add apps/x.yaml docs/y.md         -> DENY (whole command; apps/x.yaml also NOT staged)
# fix:
git add apps/x.yaml
```

### 3. History rewrites
```
git reset --hard            -> DENY (use 'git restore --staged <file>' to unstage)
git revert                  -> DENY
git rebase                  -> DENY
git commit --amend          -> DENY
git push --force / git push -f -> DENY
git push -uf / --forc / +main -> DENY (clusters, abbreviations, +refspec)
git commit -a / -am / --all   -> DENY (commits every tracked file)
git commit docs/x.md          -> DENY (path-form commit)
git commit --allow-empty -m x -> pass
```
The hook suggests forward-fixes or reviewed PRs instead.

### Command parsing
A small quote-aware tokenizer (awk) splits the command on `& ; | ( )`, backtick
and newline outside quotes. Quoted text is one token, so a commit message
cannot trigger a rule, and heredoc bodies are ignored. The subcommand is the
first non-option token after `git` (`git -C dir add ...` works). Shell
wrappers are scanned too: `sh -c "git ..."`, `eval "git ..."`, `"$(git ...)"`
and backticks inside quotes. `git add docs/x.md && git status` is denied for
the `add` segment.

## What it does NOT block (known gaps)

- **Already-staged commits:** once a file is in the index by other means, a
  plain `git commit` is allowed.
- **Git aliases and unresolved shell variables:** `git config alias.x "add -A"`
  then `git x`, or `git add "$DIR"`, cannot be seen.
- **Editing the guard config** with a file write (see "Per-project override").
- **Missing `jq`:** git commands are denied (fail closed), everything else
  passes.

## Legit bypass

This is a safety hook and over-blocks on purpose. When you are certain a
blocked command is correct, run it yourself in the terminal — the hook only
governs commands Claude issues through the Bash tool, not your shell.

## Testing

Feed sample payloads through stdin and check the output. `deny` produces a
JSON line with `permissionDecision:"deny"`; safe commands print nothing and
exit 0.

```
H=hooks/scripts/block-forbidden-git-add.sh

# must DENY:
printf '%s' '{"tool_input":{"command":"git add docs/x.md"}}'          | bash "$H"
printf '%s' '{"tool_input":{"command":"git add ../docs/x.md"}}'       | bash "$H"
printf '%s' '{"tool_input":{"command":"git add ."}}'                  | bash "$H"
printf '%s' '{"tool_input":{"command":"git commit --amend"}}'         | bash "$H"

# must PASS (empty output, exit 0):
printf '%s' '{"tool_input":{"command":"git add charts/app/x.yaml"}}'  | bash "$H"
printf '%s' '{"tool_input":{"command":"git status"}}'                 | bash "$H"
```
