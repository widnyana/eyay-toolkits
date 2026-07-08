# block-forbidden-git-add.sh

A Claude Code **PreToolUse** hook for the `Bash` tool. It inspects every
`git` command Claude is about to run and **denies** any that would stage a
protected path, stage the whole tree, or rewrite history. It is silent
(exit 0, no JSON) on everything else — so non-git commands and safe git
commands are never disturbed.

## Install / register

The script does nothing on its own; it must be wired into a Claude Code
settings file as a PreToolUse hook. Add this to `~/.claude/settings.json`
(or a project `.claude/settings.json`):

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(git *)",
            "command": "\"$HOME\"/.claude/hooks/block-forbidden-git-add.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

- `matcher: "Bash"` — only the Bash tool is inspected.
- `"if": "Bash(git *)"` — the hook body only runs when the command starts with
  `git`, keeping overhead off non-git commands.
- Requires `jq` on `PATH` (used to read the payload and emit the verdict).

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
| `FORBIDDEN_FLAGS` | `commit --amend`, `push --force`, `push -f` | Subcommand+flag pairs that rewrite history or force-push. |
| `MONITORED` | `add commit push` + the forbidden subcommands | Subcommands the hook analyzes; others are ignored. |

Edit these arrays in the script to change what is protected.

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

This is **cwd-blind by design**: `git add .` is denied even from a subdir,
because `.` from inside `docs/` would be exactly the protected case. Safe
over-blocking.

### 2. Staging a protected path (path normalization)
Explicit pathspecs are checked after stripping a leading `./`, a trailing
`/`, and one layer of surrounding quotes. A path is blocked if any component
matches a protected dir, or the basename matches a protected file. This
catches relative, absolute, parent-relative, and quoted forms alike:

```
git add docs/plan.md                  -> DENY  (docs/ protected)
git add ./docs/loki/README.md         -> DENY
git add /Users/wid/x/docs/README.md   -> DENY  (absolute path)
git add ../docs/README.md             -> DENY  (parent-relative)
git add 'docs/README.md'              -> DENY  (quoted)
git add sub/AGENTS.md                 -> DENY  (AGENTS.md basename)
git add charts/app/values.yaml        -> pass  (safe path)
```

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
```
The hook suggests forward-fixes or reviewed PRs instead.

### Command segmentation
The command is split on shell separators `& ; |` and each segment is analyzed
independently, so `git add docs/x.md && git status` is still denied for the
`add` segment.

## What it does NOT block (known gaps)

These are intentionally **not** covered today. The protected-path check only
runs in the `add` branch:

- **Path-form commit:** `git commit docs/x.md -m "msg"` stages-and-commits a
  protected path directly, bypassing `add`.
- **All-tracked commit:** `git commit -am "msg"` commits every *tracked*
  modified file, including tracked files under `docs/`, `tmp/`, `secrets/`.
- **Already-staged commits:** once a file is in the index by other means, a
  plain `git commit` is allowed.
- **`git add` with `--patch`/interactive modes** is not specially handled.

If you need these covered, the protected-path logic must be extended into the
`commit` branch (and `-a`/`--all` treated like a whole-tree add there).

## Legit bypass

This is a safety hook and over-blocks on purpose. When you are certain a
blocked command is correct, run it yourself in the terminal — the hook only
governs commands Claude issues through the Bash tool, not your shell.

## Testing

Feed sample payloads through stdin and check the output. `deny` produces a
JSON line with `permissionDecision:"deny"`; safe commands print nothing and
exit 0.

```
H=./block-forbidden-git-add.sh

# must DENY:
printf '%s' '{"tool_input":{"command":"git add docs/x.md"}}'          | bash "$H"
printf '%s' '{"tool_input":{"command":"git add ../docs/x.md"}}'       | bash "$H"
printf '%s' '{"tool_input":{"command":"git add ."}}'                  | bash "$H"
printf '%s' '{"tool_input":{"command":"git commit --amend"}}'         | bash "$H"

# must PASS (empty output, exit 0):
printf '%s' '{"tool_input":{"command":"git add charts/app/x.yaml"}}'  | bash "$H"
printf '%s' '{"tool_input":{"command":"git status"}}'                 | bash "$H"
```
