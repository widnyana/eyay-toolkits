#!/usr/bin/env bash
# usage: continue.sh <unit> <prompt-name> [branch-prefix]
# Runs one more worker in the EXISTING worktree .worktrees/<prefix>/pi-<unit> with $PI_WORK/<prompt-name>.txt.
# Use it for follow-ups (send-back with the exact failing output) and for multi-part features that land as one squash.
# Writes $PI_WORK/out-<unit> (monitor.sh <unit> keeps working). Run with nohup ... & like launch.sh.
# Same env as launch.sh, incl. PI_VERIFY_CMD (set PI_BASE when the worktree is not branched from main).
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
R=${PI_REPO:-$(git rev-parse --path-format=absolute --git-common-dir | sed 's#/\.git$##')}
S=${PI_WORK:-${TMPDIR:-/tmp}/pi-work}
unit=$1; prompt=$2; prefix=${3:-fix}
W="$R/.worktrees/$prefix/pi-$unit"
[ -d "$W" ] || { echo "missing worktree $W"; exit 1; }
[ -f "$S/$prompt.txt" ] || { echo "missing prompt $S/$prompt.txt"; exit 1; }
rm -rf "$S/out-$unit"
export MAXTOOLS=${MAXTOOLS:-40}
. "$HERE/slim-args.sh"
node "$HERE/pi-run.mjs" "$W" "$S/$prompt.txt" "$S/out-$unit" "${PI_MODEL:-}" "${PI_TIMEOUT_MIN:-40}"
echo "exit=$?"
