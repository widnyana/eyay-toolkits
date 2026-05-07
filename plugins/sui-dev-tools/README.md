# sui-dev-tools

Sui blockchain development skills for Claude Code. Covers Move smart contracts, TypeScript SDK, frontend dApp Kit, Seal secrets management, and Walrus blob storage.

## Skills

| Skill | Description |
|-------|-------------|
| `sui-dev` | Router — loads the right sub-skill based on your task |
| `sui-move` | Move smart contract development (router) |
| `sui-move-setup` | Package config (Move.toml), building, testing |
| `sui-move-syntax` | Module layout, visibility, enums, macros |
| `sui-move-object` | Structs, abilities, dynamic fields |
| `sui-move-patterns` | Events, errors, OTW, capabilities |
| `sui-move-stdlib` | Coin, Balance, strings, vectors, Option |
| `sui-ts-sdk` | TypeScript SDK v2 — PTB, client, execution |
| `sui-frontend` | Frontend dApp Kit (React + non-React) |
| `sui-seal` | Seal decentralized secrets management |
| `sui-walrus` | Walrus decentralized blob storage |

## Install

```bash
# Add the marketplace (one-time)
/plugin marketplace add widnyana/eyay-toolkits

# Install
/plugin install sui-dev-tools@eyay-toolkits
```

Verify with `/plugin list` or `/skills`. Restart Claude Code or open a new session if nothing shows up.

## Usage

Invoke a skill directly:

```
/sui-dev-tools:sui-move
/sui-dev-tools:sui-ts-sdk
/sui-dev-tools:sui-frontend
/sui-dev-tools:sui-seal
/sui-dev-tools:sui-walrus
```

Or just ask a Sui-related question — Claude will load the relevant skill automatically.

## Credits

### Core skills (Move, TypeScript SDK, Frontend)
Adapted from [MystenLabs/sui-dev-skills](https://github.com/MystenLabs/sui-dev-skills) — licensed under Apache-2.0.

### Seal and Walrus skills
Adapted from [WayneAl/sui-dev-skills](https://github.com/WayneAl/sui-dev-skills) — licensed under Apache-2.0.

## License

Apache-2.0
