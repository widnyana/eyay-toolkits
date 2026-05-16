---
name: Solana Squads Upgrade
description: This skill should be used when the user asks to "upgrade a Solana program through Squads", "set up squads multisig deployment", "create a Squads upgrade proposal", "configure squads-program-action", "deploy via Squads multisig", "set up Squads CI/CD pipeline", "squads GitHub Actions workflow", or mentions Solana program upgrades involving Squads v4 multisig governance.
version: 0.1.0
---

# Solana Squads Upgrade

Automate Solana program upgrades through Squads v4 multisig using the `squads-program-action` GitHub Action. Covers configuration, transaction building, and the full upgrade lifecycle from CI to on-chain execution.

## When to Use

- Setting up CI/CD for Solana program deployments with multisig governance
- Creating GitHub Actions workflows that submit upgrade proposals to Squads
- Configuring Anchor IDL or program-metadata updates alongside program upgrades
- Debugging failed Squads upgrade proposals
- Understanding the instruction flow: buffer -> multisig proposal -> approval -> execution

## Architecture Overview

Creates a **Squads vault transaction** (multisig proposal), not a direct on-chain upgrade.

```
CI Pipeline
  -> squads-program-action creates vault transaction
  -> Transaction appears in Squads UI (https://v4.squads.so/)
  -> Team members review + approve
  -> Squads executes: program upgrade + optional IDL + optional PDA verification
```

Key constraint: the provided keypair only needs **transaction creation permission** (voter role). The actual upgrade authority comes from the Squads vault PDA.

## Action Inputs Reference

### Required

| Input | Description |
|-------|-------------|
| `rpc` | Solana RPC URL |
| `program` | Program ID to upgrade |
| `buffer` | Buffer account containing the new program bytecode |
| `multisig` | Squads v4 multisig address |
| `keypair` | Byte array of keypair with voter permission. Format: `[23,42,53...]` |

### Optional

| Input | Default | Description |
|-------|---------|-------------|
| `idl-buffer` | — | Anchor IDL buffer address |
| `metadata-buffer` | — | program-metadata IDL buffer (alternative to `idl-buffer`) |
| `pda-tx` | — | Base64 encoded PDA verification transaction |
| `priority-fee` | `100000` | Priority fee in lamports |
| `vault-index` | `0` | Squads vault index |

**Important:** `idl-buffer` and `metadata-buffer` are mutually exclusive. Use `idl-buffer` for Anchor programs, `metadata-buffer` for non-Anchor programs or as a modern alternative.

## Transaction Construction

The action builds a `TransactionMessage` with instructions in this order:

1. **PDA verification** (if `pda-tx` provided) — prepended first
2. **Anchor IDL upgrade** or **program-metadata instructions** (if buffer provided)
3. **BPF program upgrade** — always last

The BPF upgrade targets `BPFLoaderUpgradeab1e11111111111111111111111` with the vault PDA as upgrade authority. Anchor IDL uses `idlAddress()` for account derivation. Program-metadata supports both create (new account) and update (existing account) flows with 10KB chunked extends for large data.

For detailed account layouts, discriminator bytes, metadata flow steps, and the `kitIxToWeb3` adapter, consult **`references/transaction-flow.md`**.

## Compute Budget and Retry

Uses simulation-based compute optimization: simulates with 1.4M unit cap, reads `unitsConsumed`, applies a 1.1x buffer multiplier by default. Transaction sending uses retry with progressive backoff (15 retries, 2s initial delay, +200ms per retry).

For simulation strategy details, retry configuration constants, and polling behavior, consult **`references/transaction-flow.md`**.

## Workflow Templates

For complete workflow examples, see `examples/` directory:
- **`examples/anchor-upgrade.yml`** — Full workflow for Anchor program with IDL
- **`examples/metadata-upgrade.yml`** — Full workflow with program-metadata IDL

## Security Considerations

- Store `keypair`, `multisig`, and `RPC_URL` in GitHub Secrets
- The keypair only creates proposals — cannot execute upgrades unilaterally
- Use dedicated RPC endpoints (Helius, Triton, QuickNode) for reliability
- The `pda-tx` input verifies the program's build provenance on-chain

## Dependencies

- `@sqds/multisig` (^2.1.3) — Squads v4 SDK for vault transaction creation
- `@solana-program/program-metadata` (^0.5.1) — Metadata account management
- `@solana/web3.js` (^1.98.0) — Solana transaction construction (dev dependency)
- `@coral-xyz/anchor` (^0.30.1) — Anchor IDL address derivation (dev dependency)

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot use both idl-buffer and metadata-buffer" | Both inputs provided | Pick one IDL method |
| "Could not fetch program or buffer account" | Buffer not deployed or wrong RPC | Verify buffer address and RPC |
| "Metadata buffer account not found" | Metadata buffer not uploaded | Run `write-metadata-buffer` action first |
| "Transaction simulation failed" | Insufficient compute or invalid accounts | Check priority-fee, verify all accounts exist |
| "Failed to get account info after 5 attempts" | RPC instability | Use a dedicated RPC endpoint |

## Additional Resources

### Reference Files

- **`references/transaction-flow.md`** — Instruction construction details, Squads SDK API usage, compute budget internals, retry configuration

### Examples

- **`examples/anchor-upgrade.yml`** — Complete GitHub Actions workflow for Anchor programs
- **`examples/metadata-upgrade.yml`** — Complete GitHub Actions workflow for program-metadata IDL
