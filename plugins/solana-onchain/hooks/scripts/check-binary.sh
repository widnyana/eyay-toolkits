#!/bin/bash
set -euo pipefail

if command -v solana-onchain-mcp >/dev/null 2>&1; then
    exit 0
fi

cat <<'EOF'
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "solana-onchain-mcp binary not found on PATH. The solana-onchain plugin requires this binary. Suggest the user run /solana-setup to install it."
}
EOF

exit 0
