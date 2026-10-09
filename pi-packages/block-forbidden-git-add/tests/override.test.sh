#!/usr/bin/env bash
# Behavioral tests for the per-project override. Run: bash tests/override.test.sh
H="$(cd "$(dirname "$0")/.." && pwd)/extensions/block-forbidden-git-add.sh"
fail=0
reason=""

# run <project-dir> <command> -> prints "deny" or "pass"; sets $reason
run() {
  local out
  out=$(jq -nc --arg c "$2" --arg d "$1" '{tool_input:{command:$c},cwd:$d}' | env -u CLAUDE_PROJECT_DIR "${BASH_BIN:-bash}" "$H")
  reason=$(jq -r '.hookSpecificOutput.permissionDecisionReason // ""' <<<"$out")
  [ -n "$out" ] && echo deny || echo pass
}
expect() { # name want dir cmd
  local got; got=$(run "$3" "$4")
  if [ "$got" = "$2" ]; then echo "ok   $1"; else echo "FAIL $1 (want $2, got $got)"; fail=1; fi
}
proj() { local d; d=$(mktemp -d); git -C "$d" init -q; mkdir -p "$d/.claude" "$d/.pi"; echo "$d"; }

C=block-forbidden-git-add.json
ADD="git ad""d"   # split so a git-add guard on the authoring session does not flag this file
d=$(proj)
expect "no config: docs denied"        deny "$d" "$ADD docs/x"
expect "no config: force denied"       deny "$d" "git push --force"
expect "no config: non-git passes"     pass "$d" "ls -la"
expect "no config: dotfile add passes" pass "$d" "$ADD .gitignore"

echo '{"forbidden_dirs":[]}' >"$d/.claude/$C"
expect ".claude dirs=[]: docs passes"  pass "$d" "$ADD docs/x"
expect ".claude dirs=[]: files kept"   deny "$d" "$ADD AGENTS.md"

echo '{"forbidden_dirs":["foo"]}' >"$d/.claude/$C"
expect "dirs=[foo]: foo denied"        deny "$d" "$ADD foo/x"
expect "dirs=[foo]: docs passes"       pass "$d" "$ADD docs/x"
expect "wildcard still denied"         deny "$d" "$ADD ."
expect "wildcard -A wrapped"           deny "$d" "sh -c '$ADD'; $ADD -A"

echo '{"forbidden_flags":[]}' >"$d/.claude/$C"
expect "flags=[]: force passes"        pass "$d" "git push --force"
expect "flags=[]: amend passes"        pass "$d" "git commit --amend"
expect "flags=[]: reset still denied"  deny "$d" "git reset --hard"

echo '{"forbidden_subcommands":[]}' >"$d/.claude/$C"
expect "subs=[]: rebase passes"        pass "$d" "git rebase main"
expect "subs=[]: wrapped rebase"       pass "$d" "x=\$(git rebase main)"

echo '{"forbidden_flags":["pull --rebase"]}' >"$d/.claude/$C"
expect "custom flag: pull --rebase"    deny "$d" "git pull --rebase"
expect "custom flag: wrapped"          deny "$d" "x=\$(git pull --rebase)"
expect "custom flag: push -f passes"   pass "$d" "git push -f"

# .pi layers on top of .claude (per key)
echo '{"forbidden_dirs":["foo"]}' >"$d/.claude/$C"
echo '{"forbidden_dirs":["bar"]}' >"$d/.pi/$C"
expect ".pi wins: bar denied"          deny "$d" "$ADD bar/x"
expect ".pi wins: foo passes"          pass "$d" "$ADD foo/x"
rm "$d/.claude/$C"
expect ".pi alone: bar denied"         deny "$d" "$ADD bar/x"

# fail closed
echo '{not json' >"$d/.pi/$C"
expect "bad json: add denied"          deny "$d" "$ADD x"
run "$d" "$ADD x" >/dev/null
[[ "$reason" == *"bad config"* ]] && echo "ok   bad json reason" || { echo "FAIL bad json reason: $reason"; fail=1; }
expect "bad json: non-git passes"      pass "$d" "ls"
echo '{"forbidden_dirs":"docs"}' >"$d/.pi/$C"
expect "wrong type: denied"            deny "$d" "$ADD x"
echo '{"forbiden_dirs":[]}' >"$d/.pi/$C"
expect "unknown key: denied"           deny "$d" "$ADD x"
rm "$d/.pi/$C"; echo '{}' >"$d/real.json"
ln -s ../real.json "$d/.pi/$C"
expect "symlink: denied"               deny "$d" "$ADD x"
rm "$d/.pi/$C"

# config content must never execute
printf '%s\n' "{\"forbidden_dirs\":[\"a'; touch $d/pwned; '\"]}" >"$d/.claude/$C"
run "$d" "$ADD x" >/dev/null
[ -e "$d/pwned" ] && { echo "FAIL injection executed"; fail=1; } || echo "ok   injection inert"

rm -rf "$d"
exit $fail
