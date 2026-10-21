#!/usr/bin/env bash
# usage: land.sh <unit> [branch-prefix]
# Coordinator-side gate + landing. Verifies the worker branch in its worktree, then squash-merges
# onto local main (one commit, subject/body of the worker's first commit), removes worktree and branch. Never pushes.
# env: VERIFY_CMD (run inside the worktree; must exit 0), SUBJ / BODY to override the commit message.
# Skips VERIFY_CMD when $PI_WORK/out-<unit>/verify.ok (written by pi-run.mjs's gate) equals the worktree HEAD.
set -e
S=${PI_WORK:-${TMPDIR:-/tmp}/pi-work}
R=${PI_REPO:-$(git rev-parse --path-format=absolute --git-common-dir | sed 's#/\.git$##')}
unit=$1; prefix=${2:-fix}
B="$prefix/pi-$unit"; W="$R/.worktrees/$B"
cd "$W" || { echo "NO WORKTREE: $W"; exit 1; }
if [ -n "$(git status --porcelain)" ]; then echo "WORKTREE HAS UNCOMMITTED CHANGES:"; git status --short; exit 1; fi
git --no-pager diff main...HEAD --stat | cat
git --no-pager diff main...HEAD | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | head -60
head=$(git rev-parse HEAD)
if [ "$(cat "$S/out-$unit/verify.ok" 2>/dev/null)" = "$head" ]; then echo "verify ok (driver, $head)"
else
  [ -n "${VERIFY_CMD:-}" ] && { bash -c "$VERIFY_CMD" || { echo "VERIFY FAILED"; exit 1; }; }
  echo "verify ok"
fi
cd "$R"
first=$(git --no-pager log --reverse --format=%h main..$B | head -1)
subj=$(git --no-pager log -1 --format=%s "$first"); body=$(git --no-pager log -1 --format=%b "$first" | sed '/^Co-Authored-By/d')
git merge-tree --write-tree main "$B" >/dev/null 2>&1 || { echo "MERGE WOULD CONFLICT: not merging"; exit 1; }
git merge --squash "$B" >/dev/null
[ -n "${SUBJ:-}" ] && subj=$SUBJ; [ -n "${BODY:-}" ] && body=$BODY
git commit -q -m "$subj" -m "$body"
git worktree remove "$W" && git branch -D "$B" >/dev/null
git --no-pager log --oneline -1 | cat
