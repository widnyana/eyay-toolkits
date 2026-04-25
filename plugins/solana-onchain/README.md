# solana-onchain Plugin

Solana blockchain integration for Claude Code. Query accounts, analyze transactions, execute operations — with safety safeguards for mainnet.

## Installation

```bash
# Option 1: Point to plugin directory
cc --plugin-dir /path/to/plugins/solana-onchain

# Option 2: Copy to plugins folder
cp -r plugins/solana-onchain ~/.claude-plugins/solana-onchain
```

On first session start, the plugin checks if `solana-onchain-mcp` binary is on your PATH. If missing, you'll be prompted to run `/solana-setup`.

## Setup

```
/solana-setup
```

Checks binary status, installs or updates as needed. Offers prebuilt binary (recommended) or Cargo install.

## Commands

### `/solana-setup` — Binary management

| Action | Example |
|--------|---------|
| Check status | `/solana-setup` or `/solana-setup status` |
| Install | `/solana-setup install` |
| Update | `/solana-setup update` |

Automatically compares installed version against latest release on crates.io.

### `/solana-network` — Switch networks

| Action | Example |
|--------|---------|
| Show current | `/solana-network` |
| Switch to devnet | `/solana-network devnet` |
| Switch to mainnet | `/solana-network mainnet-beta` |

Available networks: `devnet` (default), `testnet`, `localnet`, `mainnet-beta`.

Switching to mainnet requires `/solana-accept-risk` first.

### `/solana-keypair` — Configure wallet

| Action | Example |
|--------|---------|
| Show current | `/solana-keypair` |
| Set path | `/solana-keypair set ~/.config/solana/id.json` |
| Validate | `/solana-keypair validate` |

Keypair is required for write operations (transfers, token management). Only the public address is ever displayed.

### `/solana-accept-risk` — Enable mainnet

| Action | Example |
|--------|---------|
| Check status | `/solana-accept-risk` |
| Accept | `/solana-accept-risk accept` |
| Revoke | `/solana-accept-risk revoke` |

Required before any mainnet write operation. Per-session by default.

## Agents

Two agents activate automatically based on what you ask.

### Solana Account Explorer

Triggers when you ask about balances, token holdings, or account details.

```
"What's the balance of So1111...?"
"What tokens does this address hold?"
"Show recent transactions for [address]"
"Is this account active?"
```

Returns natural language summaries by default. Includes balance, token holdings, and recent activity.

### Solana Transaction Analyst

Triggers when you ask about transactions or provide a transaction hash.

```
"What does this transaction do? [hash]"
"Why did this transaction fail?"
"Explain what happened in [hash]"
```

Breaks down transactions step-by-step: who sent what to whom, which program was used, fees paid, and status.

Both agents refuse mainnet operations unless `/solana-accept-risk` has been run.

## Skills

Three background skills activate based on conversation context — you don't invoke these directly.

| Skill | Activates When |
|-------|---------------|
| Solana Blockchain Basics | You ask about blockchain concepts (accounts, SOL, transactions, tokens) |
| Solana Security & Mainnet | You discuss mainnet operations or security concerns |
| Solana Development Workflows | You're working through query/transfer/analysis workflows |

## Configuration

### Environment variables (primary)

Set in your shell rc (`.bashrc`, `.zshrc`):

```bash
export SOLANA_NETWORK=devnet                          # default network
export SOLANA_KEYPAIR_PATH=$HOME/.config/solana/id.json  # optional, for writes
export SOLANA_RPC_URL=https://api.devnet.solana.com   # optional, custom RPC
```

### Settings file (secondary)

Create `.claude/solana-onchain.local.md`:

```
SOLANA_NETWORK: devnet
SOLANA_KEYPAIR_PATH:
SOLANA_ACCEPT_RISK: false
```

This file is gitignored by default.

## Mainnet Safety

1. All operations default to **devnet** (free, no real value)
2. Switching to mainnet requires `/solana-accept-risk`
3. Agents check risk status before mainnet operations
4. Large mainnet transfers trigger extra confirmation
5. Private keys are never stored in config files

**Always test on devnet first.**

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Binary not found | `/solana-setup` |
| Mainnet blocked | `/solana-accept-risk` |
| Keypair not found | `/solana-keypair` or set `SOLANA_KEYPAIR_PATH` |
| Wrong network | `/solana-network` to check/switch |

## Support

- Issues: https://github.com/widnyana/eyay-toolkits/issues
- solana-onchain-mcp: https://github.com/widnyana/solana-onchain-mcp

## Disclaimer

Always test on devnet before mainnet. Blockchain transactions are irreversible. The authors are not responsible for lost funds.
