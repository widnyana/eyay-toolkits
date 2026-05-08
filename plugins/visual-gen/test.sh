#!/usr/bin/env bash
# Visual-gen plugin test suite.
#
# Two modes:
#   bash test.sh              Full E2E: invokes Claude CLI with prompt stubs,
#                             validates PNG output. Costs API tokens (~$1.50/test).
#   bash test.sh --check      Structure checks only: frontmatter, paths, files.
#                             No API cost.
#
# Prompt stubs live in stubs/<skill-name>.txt. These are the trigger phrases
# sent to Claude. Claude reads the skill's SKILL.md, generates HTML, runs
# screenshot.sh, and produces a PNG.
#
# All output goes to test-output/<skill-name>/:
#   prompt.txt      - the stub prompt used
#   response.txt  - Claude's full streamed response (JSONL)
#   *.png           - generated images (if any)
#
# Exit codes:
#   0 - All assertions passed
#   1 - One or more assertions failed
#   2 --check mode: all structure checks passed

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")" && pwd)"
# Resolve repo root (two levels up from plugins/visual-gen/)
REPO_ROOT="$(cd "$PLUGIN_ROOT/../.." && pwd)"
OUTPUT_DIR="$PLUGIN_ROOT/test-output"
STUBS_DIR="$PLUGIN_ROOT/stubs"
PASSED=0
FAILED=0
SKIPPED=0
FAIL_NAMES=()
MODE="full"

if [[ "${1:-}" == "--check" ]]; then
  MODE="check"
fi

# --- Helpers ---

pass() { PASSED=$((PASSED + 1)); echo "  PASS: $1"; }
fail() { FAILED=$((FAILED + 1)); FAIL_NAMES+=("$1"); echo "  FAIL: $1"; }
skip() { SKIPPED=$((SKIPPED + 1)); echo "  SKIP: $1"; }
section() { echo ""; echo "=== $1 ==="; }

assert_file() {
  local path="$1"
  local label="${2:-$path}"
  if [[ -f "$path" ]]; then
    pass "$label"
  else
    fail "$label: not found"
  fi
}

# Run one E2E test: read stub prompt, invoke Claude, validate output.
# Args: $1=skill-name, $2=expected-output-filename
run_e2e() {
  local skill="$1"
  local expected="$2"
  local stub="$STUBS_DIR/$skill.txt"
  local work="$OUTPUT_DIR/$skill"

  if [[ ! -f "$stub" ]]; then
    fail "$skill: prompt stub missing ($stub)"
    return
  fi

  mkdir -p "$work"

  local prompt
  prompt=$(cat "$stub")

  # Copy stub to output for reference
  cp "$stub" "$work/prompt.txt"

  echo "  Prompt: $prompt"
  echo "  Output: $work/"

  # Invoke Claude from repo root so relative paths in prompt stubs
  # (./plugins/visual-gen/test-output/<skill>/...) resolve correctly.
  # stream-json + --include-partial-messages writes JSONL events in real-time.
  (cd "$REPO_ROOT" && claude -p "$prompt" \
    --plugin-dir "$PLUGIN_ROOT" \
    --output-format stream-json \
    --include-partial-messages \
    --verbose \
    --max-budget-usd 1.5 \
    --no-session-persistence \
    --dangerously-skip-permissions 2>&1 || true) | tee "$work/response.txt"

  # Extract plain text from JSONL for assertion grepping.
  # Handles both "text" content blocks and tool-use result blocks.
  local RESPONSE
  RESPONSE=$(grep -oP '"(text|tool_name|input|output)"\s*:\s*"\K[^"]*' "$work/response.txt" 2>/dev/null \
    | tr -d '\n' || true)

  if [[ -z "$RESPONSE" && ! -s "$work/response.txt" ]]; then
    fail "$skill: claude produced no output"
    return
  fi

  # Check PNG was created
  local png="$work/$expected"
  if [[ ! -f "$png" ]]; then
    fail "$skill: $expected not created"
    # Diagnose
    if echo "$RESPONSE" | grep -qi "screenshot\|\.html\|1200"; then
      echo "         Skill triggered but PNG missing. Check $work/response.txt"
    else
      echo "         Skill may not have triggered. Check $work/response.txt"
    fi
    return
  fi

  local size
  size=$(stat -c%s "$png" 2>/dev/null || echo "0")

  if [[ "$size" -lt 3000 ]]; then
    fail "$skill: $expected is ${size}B (likely blank/broken)"
    return
  fi

  pass "$skill: $expected created (${size}B)"

  # Check dimensions
  if command -v identify &>/dev/null; then
    local dims
    dims=$(identify -format "%wx%h" "$png" 2>/dev/null || echo "0x0")
    local w="${dims%x*}"
    local h="${dims#*x}"
    if [[ "$w" -ge 1200 && "$h" -ge 630 ]]; then
      pass "$skill: dimensions=${w}x${h}"
    else
      fail "$skill: unexpected dimensions ${w}x${h} (expected >= 1200x630)"
    fi
  fi

  # Verify response mentions the rendering workflow
  if echo "$RESPONSE" | grep -qi "screenshot"; then
    pass "$skill: response mentions screenshot.sh"
  else
    fail "$skill: response does not mention screenshot.sh"
  fi
}

# =============================
# PHASE 1: STRUCTURE CHECKS
# =============================

section "Pre-flight"

CHROME="$(command -v google-chrome-stable || command -v google-chrome || command -v chromium-browser || command -v chromium || true)"
if [[ -n "$CHROME" ]]; then
  pass "Chrome: $(basename "$CHROME")"
else
  fail "Chrome: not found in PATH"
fi

if [[ "$MODE" == "full" ]]; then
  if command -v claude &>/dev/null; then
    pass "claude CLI: found"
  else
    fail "claude CLI: not found in PATH"
  fi
fi

mkdir -p "$OUTPUT_DIR"


section "Plugin Structure"

SKILLS=("cover-image" "architecture-diagram" "process-infographic")

assert_file "$PLUGIN_ROOT/.claude-plugin/plugin.json" "plugin.json"

for skill in "${SKILLS[@]}"; do
  assert_file "$PLUGIN_ROOT/skills/$skill/SKILL.md" "$skill/SKILL.md"
  assert_file "$PLUGIN_ROOT/skills/$skill/scripts/screenshot.sh" "$skill/scripts/screenshot.sh"
done

assert_file "$PLUGIN_ROOT/skills/architecture-diagram/examples/diagram-template.html" "diagram-template.html"


section "Prompt Stubs"

for skill in "${SKILLS[@]}"; do
  assert_file "$STUBS_DIR/$skill.txt" "$skill stub prompt"
done


section "SKILL.md Frontmatter"

for skill in "${SKILLS[@]}"; do
  f="$PLUGIN_ROOT/skills/$skill/SKILL.md"
  [[ -f "$f" ]] || { fail "$skill: SKILL.md missing"; continue; }

  head -20 "$f" | grep -q "^name:" && pass "$skill: name" || fail "$skill: missing name"
  head -20 "$f" | grep -q "^version:" && pass "$skill: version" || fail "$skill: missing version"
  head -20 "$f" | grep -q "This skill should be used when" && pass "$skill: third-person" || fail "$skill: not third-person"
  head -20 "$f" | grep -q '"create\|"generate\|"make\|"design' && pass "$skill: trigger phrases" || fail "$skill: no trigger phrases"
  head -20 "$f" | grep -q "Do NOT trigger" && pass "$skill: negative triggers" || fail "$skill: no negative triggers"
done


section "Resource Path Integrity"

for skill in "${SKILLS[@]}"; do
  f="$PLUGIN_ROOT/skills/$skill/SKILL.md"
  [[ -f "$f" ]] || continue

  grep -q '\.\./\.\.' "$f" && fail "$skill: ../../ paths" || pass "$skill: local paths"

  refs=$(grep -oE '(scripts|references|examples)/[a-zA-Z0-9_./-]+' "$f" | sort -u || true)
  for ref in $refs; do
    if [[ -f "$PLUGIN_ROOT/skills/$skill/$ref" ]]; then
      pass "$skill: $ref"
    else
      fail "$skill: $ref NOT FOUND at skills/$skill/$ref"
    fi
  done
done


# =============================
# PHASE 2: E2E TESTS (full mode only)
# =============================

if [[ "$MODE" == "full" ]]; then

  section "E2E: cover-image"
  run_e2e "cover-image" "cover.png"

  section "E2E: architecture-diagram"
  run_e2e "architecture-diagram" "diagram.png"

  section "E2E: process-infographic"
  run_e2e "process-infographic" "infographic.png"

  section "E2E: architecture-diagram-wide (2400x630)"
  run_e2e "architecture-diagram-wide" "diagram-wide.png"

  section "E2E: process-infographic-tall (1200x2400)"
  run_e2e "process-infographic-tall" "infographic-tall.png"

  section "E2E: architecture-diagram-oversized (2400x1800)"
  run_e2e "architecture-diagram-oversized" "diagram-oversized.png"

else
  section "E2E Tests"
  echo "  Skipped. Run without --check to execute E2E tests."
  echo "  Warning: E2E tests invoke claude CLI and cost API tokens (~\$1.50 each)."
  SKIPPED=$((SKIPPED + 6))
fi


# =============================
# RESULTS
# =============================

section "Results"

echo ""
echo "  Passed:  $PASSED"
echo "  Failed:  $FAILED"
echo "  Skipped: $SKIPPED"
if [[ ${#FAIL_NAMES[@]} -gt 0 ]]; then
  echo ""
  echo "  Failed tests:"
  for name in "${FAIL_NAMES[@]}"; do
    echo "    - $name"
  done
fi
echo ""

if [[ "$MODE" == "full" && -d "$OUTPUT_DIR" ]]; then
  echo "  Output: $OUTPUT_DIR/"
  for skill_dir in "$OUTPUT_DIR"/*/; do
    [[ -d "$skill_dir" ]] || continue
    name=$(basename "$skill_dir")
    echo "    $name/"
    for f in "$skill_dir"*; do
      [[ -f "$f" ]] || continue
      fname=$(basename "$f")
      fsize=$(stat -c%s "$f" 2>/dev/null || echo "?")
      echo "      $fname  ${fsize}B"
    done
  done
  echo ""
  echo "  View images: xdg-open $OUTPUT_DIR"
  echo ""
fi

if [[ $FAILED -gt 0 ]]; then
  echo "  FAILED: $FAILED assertion(s) failed."
  exit 1
elif [[ "$MODE" == "check" ]]; then
  echo "  Structure checks passed. E2E tests not run."
  exit 2
else
  echo "  All tests passed (structure + E2E)."
  exit 0
fi
