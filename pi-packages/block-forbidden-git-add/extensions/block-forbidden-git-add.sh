#!/usr/bin/env bash
# PreToolUse hook: deny git commands that stage protected paths, whole-tree
# adds, or rewrite history. Silent (exit 0) otherwise.
set -o pipefail
# Case-insensitive [[ == ]] and case: macOS and Windows file systems ignore case,
# so "Docs/x" and "claude.md" reach the protected paths. Over-blocks on Linux.
shopt -s nocasematch

# ── Configuration (single source of truth) ──────────────────────────────────
FORBIDDEN_FILES=(CLAUDE.md AGENTS.md)
FORBIDDEN_DIRS=(docs tmp secrets)
WILDCARD_TOKENS=(-A --all -u --update . '*')
FORBIDDEN_SUBCOMMANDS=(revert rebase reset filter-branch filter-repo)
# "<subcommand> <flag>". Matching: exact, flag-plus-suffix (--force-with-lease),
# short-flag cluster (-uf), long-flag abbreviation (--forc), "+" prefix.
# A trailing "$" on the flag means exact match only ("commit --all$" must not
# catch --allow-empty).
FORBIDDEN_FLAGS=(
  "commit --amend"
  "commit -a"
  'commit --all$'
  "push --force"
  "push -f"
  "push +"
)
# ────────────────────────────────────────────────────────────────────────────

input="$(</dev/stdin)"

# Fail closed without jq: we cannot parse the payload, so refuse anything that
# mentions git. The JSON below is static, no jq needed to emit it.
if ! command -v jq >/dev/null 2>&1; then
  case "$input" in
    *git*) printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked: jq is not on PATH, so the git guard cannot inspect this command. Install jq."}}' ;;
  esac
  exit 0
fi

cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"
[ -z "$cmd" ] && exit 0

# ── Per-project override ────────────────────────────────────────────────────
# <project>/.claude/block-forbidden-git-add.json, then <project>/.pi/... on top
# (later file wins per key). Lives in the repo, never under ~/.claude. A key
# present REPLACES the default list; [] empties it. Read with jq only, never
# sourced. A bad file FAILS CLOSED: monitored git calls are denied (CONFIG_ERR).
CONFIG_ERR=""
cwd="$(jq -r '.cwd // ""' <<<"$input")"
root="${CLAUDE_PROJECT_DIR:-$(git -C "${cwd:-$PWD}" rev-parse --show-toplevel 2>/dev/null)}"
root="${root:-${cwd:-$PWD}}"
for cfg in "$root/.claude/block-forbidden-git-add.json" "$root/.pi/block-forbidden-git-add.json"; do
  [ -e "$cfg" ] || [ -L "$cfg" ] || continue
  if [ -L "$cfg" ]; then CONFIG_ERR="bad config at $cfg: symlinks are not allowed"; break; fi
  if ! jq -e '
      type == "object"
      and ((keys - ["forbidden_files","forbidden_dirs","wildcard_tokens","forbidden_subcommands","forbidden_flags"]) | length == 0)
      and all(.[]; type == "array" and all(.[]; type == "string"))' "$cfg" >/dev/null 2>&1; then
    CONFIG_ERR="bad config at $cfg: must be a JSON object with only forbidden_files, forbidden_dirs, wildcard_tokens, forbidden_subcommands, forbidden_flags (string arrays)"
    break
  fi
  # @sh single-quotes every element, so the eval below cannot run config content.
  eval "$(jq -r '
    {forbidden_files:"FORBIDDEN_FILES", forbidden_dirs:"FORBIDDEN_DIRS", wildcard_tokens:"WILDCARD_TOKENS",
     forbidden_subcommands:"FORBIDDEN_SUBCOMMANDS", forbidden_flags:"FORBIDDEN_FLAGS"} as $m
    | to_entries[] | "\($m[.key])=(\(.value | map(@sh) | join(" ")))"' "$cfg")"
done

MONITORED=(add commit push)
for s in "${FORBIDDEN_SUBCOMMANDS[@]}"; do MONITORED+=("$s"); done
for e in "${FORBIDDEN_FLAGS[@]}"; do MONITORED+=("${e%% *}"); done

deny() {
  jq -nc --arg r "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# ── Tokenizer ───────────────────────────────────────────────────────────────
# One awk state machine: input in $CMD (ENVIRON, so backslashes survive), output
# one line per simple command, tokens joined by US (0x1f). It
#   - removes quotes (a quoted string is ONE token; newline inside becomes RS 0x1e)
#   - splits commands on newline ; & | ( ) and backtick, outside quotes only
#   - joins backslash-newline, drops comments
#   - drops heredoc bodies (<<W, <<-W, <<'W'); <<< is a here-string, not a heredoc
US=$'\037'
RSC=$'\036'
AWK_TOK='
BEGIN {
  s = ENVIRON["CMD"]; n = length(s)
  US = sprintf("%c", 31); RSC = sprintf("%c", 30); SQ = "\047"
  q = ""; tok = ""; has = 0; seg = ""; nt = 0; hd = ""; pend = ""
  for (i = 1; i <= n; i++) {
    c = substr(s, i, 1)
    if (hd != "") {
      j = index(substr(s, i), "\n")
      line = (j ? substr(s, i, j - 1) : substr(s, i))
      if (hdash) sub(/^\t+/, "", line)
      if (line == hd) hd = ""
      i += (j ? j - 1 : n - i)
      continue
    }
    if (q == SQ) { if (c == SQ) q = ""; else tok = tok (c == "\n" ? RSC : c); continue }
    if (q == "\"") {
      if (c == "\\") { c2 = substr(s, i + 1, 1); i++; if (c2 != "\n") tok = tok c2; continue }
      if (c == "\"") q = ""; else tok = tok (c == "\n" ? RSC : c)
      continue
    }
    if (c == SQ || c == "\"") { q = c; has = 1; continue }
    if (c == "\\") {
      c2 = substr(s, i + 1, 1); i++
      if (c2 != "\n") { tok = tok c2; has = 1 }
      continue
    }
    if (c == "#" && tok == "" && !has) {
      j = index(substr(s, i), "\n")
      i += (j ? j - 2 : n - i)
      continue
    }
    if (c == "<" && substr(s, i, 2) == "<<" && substr(s, i + 2, 1) != "<" && substr(s, i - 1, 1) != "<") {
      k = i + 2; pdash = 0
      if (substr(s, k, 1) == "-") { pdash = 1; k++ }
      while (substr(s, k, 1) == " " || substr(s, k, 1) == "\t") k++
      qc = substr(s, k, 1)
      if (qc == SQ || qc == "\"") k++; else qc = ""
      w = ""
      while (substr(s, k, 1) ~ /[A-Za-z0-9_.-]/) { w = w substr(s, k, 1); k++ }
      if (qc != "" && substr(s, k, 1) == qc) k++
      if (w != "") { pend = w; ppdash = pdash }
      i = k - 1
      continue
    }
    if (c == "\n") {
      flush_tok(); flush_seg()
      if (pend != "") { hd = pend; hdash = ppdash; pend = "" }
      continue
    }
    if (c == ";" || c == "&" || c == "|" || c == "(" || c == ")" || c == "`") { flush_tok(); flush_seg(); continue }
    if (c == " " || c == "\t") { flush_tok(); continue }
    tok = tok c; has = 1
  }
  flush_tok(); flush_seg()
}
function flush_tok() { if (has || tok != "") { seg = (nt++ ? seg US : seg) tok } tok = ""; has = 0 }
function flush_seg() { if (nt) print seg; seg = ""; nt = 0 }
'

is_monitored() {
  local t="$1" m
  for m in "${MONITORED[@]}"; do [ "$t" = "$m" ] && return 0; done
  return 1
}

# is_wc TOKEN: is a non-dash wildcard token (".", "*") configured?
is_wc() {
  local w
  for w in "${WILDCARD_TOKENS[@]}"; do
    case "$w" in -*) ;; *) [ "$1" = "$w" ] && return 0 ;; esac
  done
  return 1
}

# flag_hit ARG FLAG EXACT: does ARG select option FLAG?
flag_hit() {
  local a="$1" f="$2"
  [ "$a" = "$f" ] && return 0
  [ "$3" = 1 ] && return 1
  case "$f" in
    --*) [ "${a#"$f"}" != "$a" ] && return 0                              # --force-with-lease, --force=x
         case "$a" in --??*) [ "${f#"$a"}" != "$f" ] && return 0 ;; esac ;; # --forc (git accepts abbreviations)
    -[A-Za-z]) case "$a" in --*) ;; -*"${f#-}"*) return 0 ;; esac ;;       # -uf, -fu
    *) [ "${a#"$f"}" != "$a" ] && return 0 ;;                              # +refspec
  esac
  return 1
}

# takes_value OPT: git commit option whose value is the NEXT token.
takes_value() {
  case "$1" in
    --message|--file|--reuse-message|--reedit-message|--template|--author|--date|--cleanup|--fixup|--squash) return 0 ;;
    --*) return 1 ;;
    -*[mFCct]) return 0 ;;   # -m, -F, -C, -c, -t and clusters ending in one (-sm)
  esac
  return 1
}

# check_path PATH: deny if PATH is, or can glob to, a protected path or the whole tree.
check_path() {
  local p="$1" norm c d f last dots=1
  local -a comps
  norm="$p"
  case "$norm" in
    :/) deny "Blocked: whole-tree pathspec ':/' is not allowed (would stage protected paths: ${FORBIDDEN_DIRS[*]}/, ${FORBIDDEN_FILES[*]}). Stage explicit files/dirs instead." ;;
    :/*) norm="${norm#:/}" ;;
    :*) deny "Blocked: pathspec magic '$p' is not supported by the guard. Use a plain path." ;;
  esac
  IFS=/ read -r -a comps <<<"$norm"
  for c in "${comps[@]:-}"; do
    case "$c" in ""|.|..) ;; *) dots=0 ;; esac
  done
  if [ $dots -eq 1 ]; then   # ".", "./", "..", "../.." : the whole tree
    is_wc . && deny "Blocked: whole-tree path '$p' is not allowed (would stage protected paths: ${FORBIDDEN_DIRS[*]}/, ${FORBIDDEN_FILES[*]}). Stage explicit files/dirs instead."
    return 0
  fi
  # Components are matched as globs against protected names: "docs*", "d*" and
  # "./*" all reach docs/. "src/*" is denied for the same reason.
  last="${comps[$((${#comps[@]} - 1))]}"
  for c in "${comps[@]}"; do
    for d in "${FORBIDDEN_DIRS[@]}"; do
      # shellcheck disable=SC2053
      [[ $d == $c ]] && deny "Blocked: staging '$p' is not allowed by hook ($d/ is protected). Add other paths explicitly."
    done
  done
  for f in "${FORBIDDEN_FILES[@]}"; do
    # shellcheck disable=SC2053
    [[ $f == $last ]] && deny "Blocked: staging '$p' is not allowed by hook ($f is protected). Add other paths explicitly."
  done
  return 0
}

# check CMD: analyze one command string; recurse into shell wrappers.
check() {
  local segs seg i j n t prev first gi sub a s entry fflag exact wildcard after_dd skip w p
  local -a tok args paths
  segs=$(CMD="$1" awk "$AWK_TOK") || deny "Blocked: the git guard tokenizer failed (is awk broken?)."

  while IFS= read -r seg; do
    [ -z "$seg" ] && continue
    IFS=$US read -r -a tok <<<"$seg"
    n=${#tok[@]}
    first="${tok[0]}"; prev=""; gi=-1

    for ((i=0; i<n; i++)); do
      t="${tok[$i]}"
      # Wrapped calls: sh -c "git ...", eval "git ...", "$(git ...)", `git ...` in quotes.
      if [ "$prev" = -c ] || [[ "$prev" == -[a-zA-Z]*c ]] || [ "$first" = eval ] || [[ "$t" == *'$('* || "$t" == *'`'* ]]; then
        p="${t//$RSC/$'\n'}"
        [ "$p" != "$1" ] && check "$p"
      fi
      [ $gi -lt 0 ] && [ "${t##*/}" = git ] && gi=$i
      prev="$t"
    done
    [ $gi -lt 0 ] && continue

    # Subcommand = first non-option token after "git" (skip -C dir, -c k=v, ...).
    sub=""; j=$((gi + 1))
    while [ $j -lt $n ]; do
      t="${tok[$j]}"
      case "$t" in
        -C|-c|--git-dir|--work-tree|--namespace|--super-prefix|--config-env) j=$((j + 2)) ;;
        -*) j=$((j + 1)) ;;
        *) sub="$t"; break ;;
      esac
    done
    [ -z "$sub" ] && continue
    is_monitored "$sub" || continue
    [ -n "$CONFIG_ERR" ] && deny "Blocked: $CONFIG_ERR"
    args=("${tok[@]:$((j + 1))}")

    for s in "${FORBIDDEN_SUBCOMMANDS[@]}"; do
      [ "$sub" = "$s" ] || continue
      [ "$sub" = reset ] && deny "Blocked: 'git reset' is not allowed by hook (rewrites history / moves HEAD). To unstage, use 'git restore --staged <file>' instead."
      deny "Blocked: 'git $sub' is not allowed by hook (rewrites history / rolls back state). Use a reviewed PR or a forward-fix instead."
    done

    for entry in "${FORBIDDEN_FLAGS[@]}"; do
      [ "${entry%% *}" = "$sub" ] || continue
      fflag="${entry#* }"; exact=0
      case "$fflag" in *'$') exact=1; fflag="${fflag%?}" ;; esac
      for a in "${args[@]:-}"; do
        [ -z "$a" ] && continue
        flag_hit "$a" "$fflag" "$exact" && deny "Blocked: 'git $sub $fflag' is not allowed by hook (history rewrite or whole-tree commit/push)."
      done
    done

    if [ "$sub" = add ] || [ "$sub" = commit ]; then
      wildcard=0; after_dd=0; skip=0; paths=()
      for t in "${args[@]:-}"; do
        [ -z "$t" ] && continue
        if [ $skip -eq 1 ]; then skip=0; continue; fi
        if [ $after_dd -eq 0 ]; then
          case "$t" in
            --) after_dd=1; continue ;;
            -*)
              if [ "$sub" = add ]; then
                for w in "${WILDCARD_TOKENS[@]}"; do
                  case "$w" in -*) flag_hit "$t" "$w" 0 && wildcard=1 ;; esac
                done
              else
                takes_value "$t" && skip=1
              fi
              continue ;;
          esac
        fi
        if [ "$sub" = add ] && is_wc "$t"; then wildcard=1; continue; fi
        paths+=("$t")
      done
      [ $wildcard -eq 1 ] && deny "Blocked: whole-tree 'git add' is not allowed (would stage protected paths: ${FORBIDDEN_DIRS[*]}/, ${FORBIDDEN_FILES[*]}). Stage explicit files/dirs instead."
      for p in "${paths[@]:-}"; do
        [ -z "$p" ] || check_path "$p"
      done
    fi
  done <<<"$segs"
}

check "$cmd"
exit 0
