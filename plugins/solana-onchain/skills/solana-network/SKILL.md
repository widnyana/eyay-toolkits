---
name: solana-network
description: |
  Display current Solana network and switch between devnet, testnet, localnet, and mainnet-beta.
  Use this skill when the user runs /solana-network, asks to "switch network", "use mainnet",
  "connect to devnet", or mentions changing the Solana network they're connected to.
argument-hint: "[network] (optional: devnet, testnet, localnet, or mainnet-beta)"
allowed-tools: [Bash]
---

Manage the active Solana network. Default is devnet.

Review: $ARGUMENTS

## Instructions

### No arguments — show current network

1. Read `SOLANA_NETWORK` from environment. If unset, assume `devnet`.
2. Display current network and available options:

```
Current network: [network]

Available:
  devnet        - Testing, free SOL via airdrop
  testnet       - Community testnet, real conditions, no risk
  localnet      - Local validator, requires local setup
  mainnet-beta  - Production, real SOL, requires /solana-accept-risk
```

### Switching to devnet / testnet / localnet

1. Set `SOLANA_NETWORK` to the requested value.
2. Confirm the switch with network details.

### Switching to mainnet-beta

1. Check if `SOLANA_ACCEPT_RISK` is set to `true`.
2. If not accepted — refuse the switch and tell the user to run `/solana-accept-risk` first.
3. If accepted — switch and show mainnet safety reminders:
   - Verify addresses 3x before transferring
   - Start with tiny test amounts (0.001 SOL)
   - Simulate all transactions first

### Invalid network name

Show error with valid options: `devnet`, `testnet`, `localnet`, `mainnet-beta`.

### Notes

- Network defaults to devnet on session restart.
- Custom RPC: set `SOLANA_RPC_URL` environment variable.
