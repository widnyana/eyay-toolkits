#!/usr/bin/env bash
# Behavioral tests for the guard with DEFAULT rules.
# Run: bash tests/guard.test.sh        (BASH_BIN=/bin/bash to test bash 3.2)
H="$(cd "$(dirname "$0")/.." && pwd)/extensions/block-forbidden-git-add.sh"
B="${BASH_BIN:-bash}"
fail=0
T=$(mktemp -d)   # no config files in here: defaults apply

run() { # prints deny|pass
  local out
  out=$(jq -nc --arg c "$1" --arg d "$T" '{tool_input:{command:$c},cwd:$d}' | env -u CLAUDE_PROJECT_DIR "$B" "$H" 2>&1)
  [[ "$out" == *'"permissionDecision":"deny"'* ]] && echo deny || { [ -z "$out" ] && echo pass || echo "ERR:$out"; }
}
expect() { # want cmd
  local got; got=$(run "$2")
  if [ "$got" = "$1" ]; then echo "ok   $1 $2" | head -1; else echo "FAIL want=$1 got=$got :: $2"; fail=1; fi
}

echo "-- basics"
expect pass 'git status'
expect pass 'ls -la'
expect deny 'git add .'
expect deny 'git add -A'
expect deny 'git add --all'
expect deny 'git add -u'
expect deny 'git add *'
expect deny 'git add docs/x.md'
expect deny 'git add ./docs/x.md'
expect deny 'git add ../docs/x.md'
expect deny 'git add /Users/x/proj/docs/x.md'
expect deny "git add 'docs/x.md'"
expect deny 'git add sub/AGENTS.md'
expect deny 'git add docs/x.md && git status'
expect pass 'git add charts/app/x.yaml'
expect pass 'git add .gitignore'
expect pass 'git add -- docs-tool/x'
expect deny 'git reset --hard'
expect deny 'git revert HEAD'
expect deny 'git rebase main'
expect deny 'git commit --amend'
expect deny 'git push --force'
expect deny 'git push -f'
expect deny 'git push --force-with-lease'

echo "-- audit: misses"
expect deny 'git add -- .'
expect deny 'git add ./*'
expect deny 'git add docs*'
expect deny 'git add d*'
expect deny 'git add *.md'
expect deny 'git add src/*'
expect pass 'git add src/*.ts'
expect deny 'git add :/'
expect deny 'git add :/docs'
expect deny 'git add :(top)docs'
expect deny 'git add ..'
expect deny 'git add "docs/my file.md"'
expect deny 'git add docs/my\ file.md'
expect deny 'git add Docs/x.md'
expect deny 'git add claude.md'
expect deny 'git add -fA'
expect deny 'git add --al'
expect deny 'git push origin +main'
expect deny 'git push -uf origin main'
expect deny 'git push --forc'
expect deny 'git commit --amen'
expect deny 'git commit -am x'
expect deny 'git commit -a -m x'
expect deny 'git commit --all -m x'
expect deny 'git commit docs/x.md -m x'
expect deny 'git commit -m x -- docs/x.md'
expect deny 'git commit -m x CLAUDE.md'

echo "-- audit: false positives"
expect pass 'git commit -m "x; git add docs/y.md"'
expect pass 'git commit -m "docs: add docs/guide.md"'
expect pass 'git commit -m "revert the earlier thing"'
expect pass 'git commit -F docs/msg.txt'
expect pass 'git commit --allow-empty -m x'
expect pass 'git commit -m x'
expect pass 'git checkout feature/rebase'
expect pass 'git checkout reset-branch'
expect pass 'git branch -D revert-123'
expect pass 'git log --oneline origin/rebase'
expect pass 'git -C docs status'
expect pass 'echo add docs'
expect pass 'git checkout add'
expect pass 'grep -r "git reset" .'
expect pass $'git commit -F - <<\'EOF\'\ndocs: add docs/guide.md\nrevert the earlier thing\nEOF'
expect pass $'git commit -m "$(cat <<\'EOF\'\nfeat: add tmp cleanup\npush the button\nEOF\n)"'
expect pass $'# git add .\ngit status'

echo "-- wrappers and bypass attempts"
expect deny 'sh -c "git rebase main"'
expect deny "bash -lc 'git add .'"
expect deny 'eval "git reset --hard"'
expect deny 'x=$(git rebase main)'
expect deny 'echo "$(git reset --hard)"'
expect deny 'echo `git reset --hard`'
expect deny 'FOO=1 git add docs/x'
expect deny '/usr/bin/git add docs/x'
expect deny 'git -C . add docs/x'
expect deny 'git -c user.name=x add docs/x'
expect deny $'cat <<<x\ngit add .'
expect deny $'echo "<<X"\ngit add .\nX'
expect deny $'git add \\\n  charts/x.yaml \\\n  docs/y.md'
expect deny $'git status\ngit add docs/x'
expect deny 'cd /tmp && git add docs/x'

echo "-- jq missing: fail closed for git, pass otherwise"
j() { printf '%s' "$1" | env PATH=/nonexistent /bin/bash "$H" 2>/dev/null; }
[[ "$(j '{"tool_input":{"command":"git add ."}}')" == *deny* ]] && echo "ok   jq missing + git" || { echo "FAIL jq missing + git"; fail=1; }
[ -z "$(j '{"tool_input":{"command":"ls"}}')" ] && echo "ok   jq missing + ls" || { echo "FAIL jq missing + ls"; fail=1; }

rm -rf "$T"
exit $fail
