---
name: solana-keypair
description: |
  Configure and validate a Solana keypair for write operations (transfers, token management).
  Use this skill when the user runs /solana-keypair, asks to "set up keypair", "configure wallet",
  "add my keypair", or mentions keypair setup for signing transactions.
argument-hint: "[action] (optional: show, set <path>, validate)"
allowed-tools: [Bash]
---

Configure the Solana keypair used for signing write operations.

Review: $ARGUMENTS

## Instructions

### show (default)

1. Read `SOLANA_KEYPAIR_PATH` from environment.
2. If set and file exists — show public address (never the private key).
3. If not set — show setup instructions:
   ```
   Option 1 (env var): export SOLANA_KEYPAIR_PATH=~/.config/solana/id.json
   Option 2 (command): /solana-keypair set /path/to/keypair.json
   ```

### set <path>

1. Validate the file exists and is readable.
2. If valid — extract public address, confirm success.
3. If invalid — show error with troubleshooting (check path, permissions, format).
4. Always remind: keypair files are sensitive. Never share or commit them.

### validate

1. Check file exists, is readable, and is valid Solana keypair format.
2. Show validation result with details (path, public address, permissions).

### Security rules

- Never display private keys — only public addresses.
- Warn users to `chmod 400` keypair files.
- Remind that keypair controls all funds in the associated wallet.
- Suggest dedicated wallets for testing, hardware wallets for large amounts.

### Keypair creation (if user has none)

Point user to:
- `solana-keygen new --outfile ~/.config/solana/id.json`
- Wallet apps: Solflare, Phantom, Magic Eden (export keypair to JSON)

### Related skills

- `/solana-accept-risk` — required before mainnet write operations
- `/solana-network` — choose which network to use
