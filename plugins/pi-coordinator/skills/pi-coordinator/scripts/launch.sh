#!/usr/bin/env bash
# usage: launch.sh <unit> [branch-prefix]
# Prompt must exist at $PI_WORK/<unit>.txt. Creates worktree .worktrees/<prefix>/pi-<unit> from main,
# runs one pi RPC worker in it (blocking). Run it with nohup ... & so the coordinator stays free.
# env: PI_WORK (scratch dir, default $TMPDIR/pi-work), PI_MODEL (optional override;
#      unset lets pi use its own configured default), MAXTOOLS (default 60), PI_TIMEOUT_MIN (default 40),
#      PI_EXTRA_ARGS / PI_THINKING / PI_GUARD_EXT (see slim-args.sh),
#      PI_VERIFY_CMD / PI_VERIFY_ROUNDS / PI_BASE (driver gate + baseline, see pi-run.mjs);
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
# Pre-flight: fail fast on a broken environment instead of each worker rediscovering it mid-run.
command -v node >/dev/null 2>&1 || { echo "preflight: node not on PATH"; exit 1; }
export PI_BASE=${PI_BASE:-main}
git rev-parse --verify --quiet "$PI_BASE" >/dev/null || { echo "preflight: base ref '$PI_BASE' not found"; exit 1; }
[ -n "${PI_VERIFY_CMD:-}" ] || echo "preflight: PI_VERIFY_CMD unset — worker runs ungated (settled, not verified)" >&2
[ -n "${PI_BASELINE_PREP:-}" ] || [ -z "${PI_VERIFY_CMD:-}" ] || echo "preflight: PI_BASELINE_PREP unset — baseline verify runs in a fresh worktree; set it if verify needs installed deps" >&2
[ -n "${MAXTOOLS:-}" ] || echo "preflight: MAXTOOLS unset — no tool cap (default 60 applies)" >&2
R=${PI_REPO:-$(git rev-parse --path-format=absolute --git-common-dir | sed 's#/\.git$##')}
S=${PI_WORK:-${TMPDIR:-/tmp}/pi-work}
unit=$1; prefix=${2:-fix}
W="$R/.worktrees/$prefix/pi-$unit"
mkdir -p "$S"
[ -f "$S/$unit.txt" ] || { echo "missing prompt $S/$unit.txt"; exit 1; }
cd "$R" || exit 1
git worktree add "$W" -b "$prefix/pi-$unit" "$PI_BASE" >/dev/null 2>&1 || { echo "worktree add failed"; exit 1; }
rm -rf "$S/out-$unit"
export MAXTOOLS=${MAXTOOLS:-60}
. "$HERE/slim-args.sh"
node "$HERE/pi-run.mjs" "$W" "$S/$unit.txt" "$S/out-$unit" "${PI_MODEL:-}" "${PI_TIMEOUT_MIN:-40}"
echo "exit=$?"
