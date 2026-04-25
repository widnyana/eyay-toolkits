---
name: solana-accept-risk
description: |
  Accept or revoke explicit risk acknowledgment for mainnet-beta operations.
  Use this skill when the user runs /solana-accept-risk, asks to "enable mainnet",
  "accept risk", "revoke risk", or when mainnet operations are blocked.
argument-hint: "[action] (optional: accept, revoke, status)"
allowed-tools: [Bash]
---

Manage mainnet risk acceptance. Required before any mainnet write operations.

Review: $ARGUMENTS

## Instructions

### status (default)

1. Check `SOLANA_ACCEPT_RISK` environment variable.
2. If `true` — show acceptance is active.
3. If not set — show that mainnet operations are blocked and how to accept.

### accept

1. Show risk disclosure:
   - Transactions are permanent and irreversible
   - Sending to wrong address = permanent loss
   - No customer service or recovery
   - User accepts full responsibility
2. Ask user to confirm by typing `ACCEPT`.
3. On confirmation — set `SOLANA_ACCEPT_RISK=true` and record timestamp.
4. Show safety reminders:
   - Always simulate before executing
   - Triple-check recipient addresses
   - Start with tiny test amounts
   - Keep keypair secure

### revoke

1. Confirm user wants to revoke.
2. Unset `SOLANA_ACCEPT_RISK`.
3. Confirm mainnet operations are now blocked.
4. Tell user to run `/solana-accept-risk accept` to re-enable.

### Mainnet safety gate

Before ANY mainnet write operation, check:
1. `SOLANA_ACCEPT_RISK` is `true`
2. If not — refuse the operation and tell user to run `/solana-accept-risk`

For large amounts on mainnet, request extra explicit confirmation showing:
- Recipient address
- Amount and approximate USD value
- That this is mainnet with real SOL

### Scope

- Acceptance is per-session by default (resets on Claude Code restart).
- Can be persisted via plugin settings if user configures it.
- Does NOT affect devnet/testnet/localnet operations.
