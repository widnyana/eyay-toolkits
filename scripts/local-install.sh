#!/usr/bin/env bash
# Local install of the pi/omp packages in this repo into both runtimes.
# Uses path installs (live links in omp, registered paths in pi) so edits
# in pi-packages/ apply on the next restart — no npm publish needed.
#
# Usage: bash scripts/local-install.sh [package ...]
#        (default: block-forbidden-git-add design-thinking agent-notify)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGES=(${@:-block-forbidden-git-add design-thinking agent-notify})

for pkg in "${PACKAGES[@]}"; do
	dir="$REPO_ROOT/pi-packages/$pkg"
	[ -d "$dir" ] || { echo "skip: pi-packages/$pkg does not exist" >&2; continue; }
	echo "== $pkg =="
	omp install "$dir"
	pi install "$dir"
done

echo "Done. Restart omp/pi to load the extensions."
