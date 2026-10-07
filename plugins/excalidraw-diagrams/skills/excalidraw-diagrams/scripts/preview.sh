#!/usr/bin/env bash
# Render frames to PNG for a visual check (macOS: qlmanage). Not Excalidraw's own renderer.
# usage: preview.sh scene.excalidraw outdir [frame index ...]
# env TILE=1300 renders square tiles of that many scene px (zoomed view) instead of whole frames.
set -euo pipefail
scene=$1; out=$2; shift 2
here=$(cd "$(dirname "$0")" && pwd)
rm -rf "$out/svg" "$out/png"; mkdir -p "$out/svg" "$out/png"
python3 "$here/render.py" "$scene" "$out/svg" "$@" > "$out/list.txt"
while read -r f; do qlmanage -t -s 2400 -o "$out/png" "$f" >/dev/null 2>&1; done < "$out/list.txt"
ls "$out/png"
