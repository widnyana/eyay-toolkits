#!/usr/bin/env bash
# PreToolUse hook: deny git commands that stage protected paths, whole-tree
# adds, or rewrite history. Silent (exit 0) otherwise.
set -o pipefail

# ── Configuration (single source of truth) ──────────────────────────────────
FORBIDDEN_FILES=(CLAUDE.md AGENTS.md)
FORBIDDEN_DIRS=(docs tmp secrets)
WILDCARD_TOKENS=(-A --all -u --update . '*')
FORBIDDEN_SUBCOMMANDS=(revert rebase reset filter-branch filter-repo)
FORBIDDEN_FLAGS=(
  "commit --amend"
  "push --force"
  "push -f"
)
MONITORED=(add commit push)
for s in "${FORBIDDEN_SUBCOMMANDS[@]}"; do MONITORED+=("$s"); done
# ────────────────────────────────────────────────────────────────────────────

input="$(cat)"
cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"
[ -z "$cmd" ] && exit 0

deny() {
  jq -nc --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

is_monitored() {
  local t="$1" m
  for m in "${MONITORED[@]}"; do [ "$t" = "$m" ] && return 0; done
  return 1
}

segments="$(printf '%s\n' "$cmd" | tr '&;|' '\n\n\n')"

while IFS= read -r seg; do
  [ -z "$seg" ] && continue
  read -r -a tok <<<"$seg"
  n=${#tok[@]}

  sub=""; sub_idx=-1
  for ((i=0; i<n; i++)); do
    if is_monitored "${tok[$i]}"; then sub="${tok[$i]}"; sub_idx=$i; break; fi
  done
  [ -z "$sub" ] && continue
  args=("${tok[@]:$((sub_idx+1))}")

  for s in "${FORBIDDEN_SUBCOMMANDS[@]}"; do
    if [ "$sub" = "reset" ]; then
      deny "Blocked: 'git reset' is not allowed by hook (rewrites history / moves HEAD). To unstage, use 'git restore --staged <file>' instead."
    fi
    [ "$sub" = "$s" ] && deny "Blocked: 'git $sub' is not allowed by hook (rewrites history / rolls back state). Use a reviewed PR or a forward-fix instead."
  done

  for entry in "${FORBIDDEN_FLAGS[@]}"; do
    fsub="${entry%% *}"
    fflag="${entry#* }"
    [ "$sub" != "$fsub" ] && continue
    for a in "${args[@]:-}"; do
      [ -z "$a" ] && continue
      if [ "$a" = "$fflag" ] || [ "${a#"$fflag"}" != "$a" ]; then
        deny "Blocked: 'git $sub $fflag' is not allowed by hook (rewrites history)."
      fi
    done
  done

  if [ "$sub" = "add" ]; then
    wildcard=0; after_dd=0; paths=()
    for t in "${args[@]:-}"; do
      [ -z "$t" ] && continue
      if [ $after_dd -eq 1 ]; then paths+=("$t"); continue; fi
      case "$t" in
        --) after_dd=1 ;;
        *)
          wc=0
          for w in "${WILDCARD_TOKENS[@]}"; do [ "$t" = "$w" ] && wc=1; done
          if [ $wc -eq 1 ]; then
            wildcard=1
          else
            case "$t" in -*) ;; *) paths+=("$t") ;; esac
          fi ;;
      esac
    done
    [ $wildcard -eq 1 ] && deny "Blocked: whole-tree 'git add' is not allowed (would stage protected paths: ${FORBIDDEN_DIRS[*]}/, ${FORBIDDEN_FILES[*]}). Stage explicit files/dirs instead."
    for p in "${paths[@]:-}"; do
      [ -z "$p" ] && continue
      norm="${p#./}"; norm="${norm%/}"
      case "$norm" in \'*\') norm="${norm#\'}"; norm="${norm%\'}";; \"*\") norm="${norm#\"}"; norm="${norm%\"}";; esac
      for f in "${FORBIDDEN_FILES[@]}"; do
        case "$norm" in "$f"|*/"$f") deny "Blocked: staging '$p' is not allowed by hook ($f is protected). Add other paths explicitly." ;; esac
      done
      for d in "${FORBIDDEN_DIRS[@]}"; do
        case "$norm" in
          "$d"|"$d"/*|*/"$d"|*/"$d"/*) deny "Blocked: staging '$p' is not allowed by hook ($d/ is protected). Add other paths explicitly." ;;
        esac
      done
    done
  fi
done <<<"$segments"

exit 0
