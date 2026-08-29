#!/bin/bash
# Zero-dependency smoke test for the design-thinking plugin's stateful parts:
# the SessionStart hook script (the only real branch logic in this plugin)
# and the JSON manifests. Run: bash plugins/design-thinking/tests/smoke.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="$(cd "$HERE/.." && pwd)"
HOOK="$PKG/hooks/scripts/inject-design-thinking.sh"

fail=0
ok() {
  local cond=$1 label=$2
  if [ "$cond" -eq 0 ]; then
    echo "PASS  $label"
  else
    echo "FAIL  $label"
    fail=$((fail + 1))
  fi
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/.claude"

# 1. enabled: true -> announces mode
cat > "$TMP/.claude/design-thinking.local.md" <<'EOF'
---
enabled: true
---
EOF
out=$(CLAUDE_PROJECT_DIR="$TMP" CLAUDE_PLUGIN_ROOT="$PKG" bash "$HOOK")
echo "$out" | grep -q "DESIGN THINKING MODE"
ok $? "enabled:true prints the mode block"

# 2. enabled: false -> silent
cat > "$TMP/.claude/design-thinking.local.md" <<'EOF'
---
enabled: false
---
EOF
out=$(CLAUDE_PROJECT_DIR="$TMP" CLAUDE_PLUGIN_ROOT="$PKG" bash "$HOOK")
[ -z "$out" ]
ok $? "enabled:false prints nothing"

# 3. no state file -> silent
rm -f "$TMP/.claude/design-thinking.local.md"
out=$(CLAUDE_PROJECT_DIR="$TMP" CLAUDE_PLUGIN_ROOT="$PKG" bash "$HOOK")
[ -z "$out" ]
ok $? "missing state file prints nothing"

# 4. manifests parse as JSON
if command -v jq >/dev/null 2>&1; then
  jq . "$PKG/.claude-plugin/plugin.json" >/dev/null
  ok $? "plugin.json is valid JSON"
  jq . "$PKG/hooks/hooks.json" >/dev/null
  ok $? "hooks.json is valid JSON"
else
  echo "SKIP  jq not installed — skipping manifest JSON checks"
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "$fail CHECK(S) FAILED"
  exit 1
fi
echo
echo "ALL CHECKS PASS"
