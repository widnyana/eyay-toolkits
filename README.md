# eyay-toolkits

Claude Code plugins for people who'd rather ship than configure.

These started as things I kept re-teaching Claude in every session -- review patterns, decimal validation traps, how to write without sounding like a press release. Eventually I packed them into skills so I could stop repeating myself. If any of them save you time, good. Steal them.

## The plugins

| Plugin | What it does | Details |
|--------|-------------|---------|
| **career-tools** | Cover letters and CVs from repo contents. Markdown or ATS-friendly LaTeX. | [README](plugins/career-tools/README.md) |
| **evm-decimal-validation** | Audits hardcoded decimals, queries on-chain values, fixes FromWei/ToWei conversions. Catches the "18 decimals everywhere" mistake before it hits production. | [README](plugins/evm-decimal-validation/README.md) |
| **solana-onchain** | Query accounts, analyze transactions, execute operations on Solana. Defaults to devnet because mainnet mistakes are permanent. | [README](plugins/solana-onchain/README.md) |
| **sui-dev-tools** | Move smart contracts, TypeScript SDK, dApp Kit, Seal secrets, Walrus storage. All the Sui things in one plugin. | [README](plugins/sui-dev-tools/README.md) |
| **technical-writer** | Docs and articles that read like a colleague explaining something over coffee. Problem-first, concrete, no filler. Public and internal modes. | [README](plugins/technical-writer/README.md) |
| **ts-backend-dev** | TypeScript backend skills: kill N+1 queries, review code for architecture and security issues, design Prisma schemas that won't paint you into a corner. | [README](plugins/ts-backend-dev/README.md) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the plugin structure and how to add your own.

## License

[MIT](LICENSE) -- see individual plugin directories for specifics.
