#!/usr/bin/env bash
# Capture an HTML file as a PNG screenshot using Chrome headless.
#
# Usage: screenshot.sh <input.html> <output.png> [width] [height]
#   input.html  - Path to the HTML file to capture
#   output.png  - Path for the output PNG
#   width       - Viewport width (default: auto-detect from HTML, or 1200)
#   height      - Viewport height (default: auto-detect from HTML, or 630)
#
# Auto-detects canvas dimensions from the HTML body CSS by picking the
# largest width/height values found. Chrome headless has no physical screen
# limit, so arbitrary canvas sizes (e.g. 3000x2000) render correctly.
# Explicit width/height args always override auto-detection.
#
# Requires: google-chrome or chromium in PATH

set -euo pipefail

INPUT="$(realpath "$1")"
OUTPUT="$(realpath "$2")"

if [[ ! -f "$INPUT" ]]; then
  echo "error: $INPUT not found" >&2
  exit 1
fi

CHROME="$(command -v google-chrome-stable || command -v google-chrome || command -v chromium-browser || command -v chromium || true)"

if [[ -z "$CHROME" ]]; then
  echo "error: no Chrome/Chromium binary found in PATH" >&2
  exit 1
fi

# Auto-detect canvas dimensions from HTML body CSS.
# Picks the largest width/height values (the canvas is always the largest
# element). Component heights (36px markers, 20px arrows) are filtered out
# by taking the maximum.
AUTO_WIDTH=$(grep -oP 'width\s*:\s*\K[0-9]+' "$INPUT" 2>/dev/null | sort -rn | head -1 || true)
AUTO_HEIGHT=$(grep -oP 'height\s*:\s*\K[0-9]+' "$INPUT" 2>/dev/null | sort -rn | head -1 || true)

# Priority: explicit args > auto-detect from CSS > defaults
WIDTH="${3:-${AUTO_WIDTH:-1200}}"
HEIGHT="${4:-${AUTO_HEIGHT:-630}}"

cd "$(dirname "$INPUT")"

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --disable-dev-shm-usage \
  --hide-scrollbars \
  --screenshot="$OUTPUT" \
  --window-size="${WIDTH},${HEIGHT}" \
  "file://$INPUT"

echo "saved: $OUTPUT (${WIDTH}x${HEIGHT})"
