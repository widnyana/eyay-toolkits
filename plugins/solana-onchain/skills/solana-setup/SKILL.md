---
name: solana-setup
description: |
  Install, update, or verify the solana-onchain-mcp binary. Use when user runs /solana-setup,
  asks to "install solana binary", "update solana-onchain-mcp", "check solana setup",
  "set up solana plugin", or when the binary is missing from PATH.
argument-hint: "[action] (optional: status, install, update)"
allowed-tools: [Bash]
---

Install, update, or verify the solana-onchain-mcp binary.

Review: $ARGUMENTS

## Instructions

### status (default)

1. Check binary exists: `command -v solana-onchain-mcp`
2. If not found — report "solana-onchain-mcp is not installed" and skip to install section.
3. If found — get installed version: `solana-onchain-mcp --version`
4. Get latest version:
   ```bash
   curl -sf --connect-timeout 5 https://crates.io/api/v1/crates/solana-onchain-mcp | python3 -c "import sys,json; print(json.load(sys.stdin)['crate']['max_version'])" 2>/dev/null
   ```
   If network fails: report installed version only, warn that latest check failed.
5. Compare versions and report:
   - Same: "v{version} is up to date."
   - Different: "Installed v{installed}, latest v{latest}. Run /solana-setup update."

### install

1. Confirm with user which method:
   - **Prebuilt binary (recommended)**: `curl -fsSL https://raw.githubusercontent.com/widnyana/solana-onchain-mcp/refs/heads/main/install.sh | bash`
   - **Cargo**: `cargo install solana-onchain-mcp`
2. Execute the chosen command.
3. Verify: `command -v solana-onchain-mcp && solana-onchain-mcp --version`
4. Report success with binary location and version.

### update

1. Check installed version: `solana-onchain-mcp --version`
2. Check latest version (same as status step 4).
3. If already latest: report "Already up to date."
4. If outdated: confirm with user, then:
   - Prebuilt: re-run install.sh (always fetches latest)
   - Cargo: `cargo install solana-onchain-mcp --force`
5. Verify new version after update.

### Error handling

- `curl` fails: suggest checking internet connection, offer to retry
- `cargo` not found: suggest prebuilt method or installing Rust
- Permission denied: suggest checking install directory permissions
- Version check fails: still allow install, just can't compare versions
