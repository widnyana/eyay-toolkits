# eyay-toolkits

Claude Code plugins for people who'd rather ship than configure.

These started as things I kept re-teaching Claude in every session -- review patterns, decimal validation traps, how to write without sounding like a press release. Eventually I packed them into skills so I could stop repeating myself. If any of them save you time, good. Steal them.

## Quick start

You need [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and a working API key or subscription. Then:

```bash
# Add the marketplace (one-time)
/plugin marketplace add widnyana/eyay-toolkits

# Install what you need
/plugin install career-tools@eyay-toolkits
/plugin install evm-decimal-validation@eyay-toolkits
/plugin install solana-onchain@eyay-toolkits
/plugin install technical-writer@eyay-toolkits
/plugin install ts-backend-dev@eyay-toolkits
```

Verify with `/plugin list` or check loaded skills with `/skills`. Restart Claude Code or open a new session if nothing shows up.

Uninstall any time: `/plugin uninstall <plugin-name>`

## The plugins

### career-tools

Builds cover letters and CVs from whatever's lying around in your repo -- README files, project descriptions, commit messages, whatever Claude can find. Outputs Markdown by default, LaTeX if you ask for it. The LaTeX template is ATS-optimized because most resume screeners can't read fancy formatting.

```bash
/plugin install career-tools@eyay-toolkits
```

| Skill | What it does |
|-------|-------------|
| `cover-letter-builder` | Matches your background to a job posting, writes a cover letter that doesn't sound like a template |
| `cv-builder` | Scans repo for experience/skills/education, produces an ATS-friendly CV. Run `pdftotext` on the output to verify it parses correctly |

### evm-decimal-validation

Same token, different chain, different decimals. This bites people more often than you'd think -- you hardcode 18 decimals because that's "standard," deploy to a chain where the token uses 6, and suddenly amounts are off by twelve orders of magnitude. This skill audits your config, queries on-chain values, and fixes the conversions.

```bash
/plugin install evm-decimal-validation@eyay-toolkits
```

Covers: audit hardcoded decimals, query on-chain `decimals()`, add per-chain config, fix `FromWei`/`ToWei`, write tests.

### solana-onchain

Query accounts, analyze transactions, execute operations on Solana. Defaults to devnet because mainnet transactions are irreversible and the authors are not responsible for your SOL. Switching to mainnet requires an explicit risk acceptance step per session -- not because we think you're careless, but because we've been careless.

```bash
/plugin install solana-onchain@eyay-toolkits
```

| Skill | What it does |
|-------|-------------|
| `/solana-setup` | Install/update the MCP binary |
| `/solana-network` | Switch networks (devnet, testnet, localnet, mainnet-beta) |
| `/solana-keypair` | Set wallet path for write operations |
| `/solana-accept-risk` | Unlock mainnet -- required every session |

Two agents activate based on context (you don't call these directly):
- **Account Explorer** -- triggers on balance/token/account queries
- **Transaction Analyst** -- triggers when you paste a tx hash or ask "what happened here"

### technical-writer

Writes docs and articles the way you'd explain something to a colleague over coffee -- problem-first, concrete, no filler. No "revolutionary," no "best practices" without evidence, no ALL CAPS headers. Has public mode (more context) and internal mode (tighter). The skill that wrote this README, as it happens.

```bash
/plugin install technical-writer@eyay-toolkits
```

Handles: blog posts, postmortems, code reviews, how-to guides, concept explanations.

### ts-backend-dev

Three skills for TypeScript backend work: squeeze performance out of database queries, catch issues in code review, and design Prisma schemas without painting yourself into a corner.

```bash
/plugin install ts-backend-dev@eyay-toolkits
```

| Skill | What it does |
|-------|-------------|
| `ts-db-perf` | Kill N+1 queries, add caching, batch writes, prevent race conditions |
| `ts-review` | Review code for architecture, security, error handling, type safety |
| `prisma-schema` | Design schemas with multi-schema support, soft deletes, snake_case mapping, UUID keys |

## Manual install

If the marketplace approach doesn't work (it happens), you can clone and point directly:

```bash
git clone https://github.com/widnyana/eyay-toolkits.git
cc --plugin-dir ./plugins/<plugin-name>
```

Or copy into your local plugins folder:

```bash
cp -r plugins/<plugin-name> ~/.claude-plugins/<plugin-name>
```

To update: re-run the install command, or `git pull` if manual. Then restart Claude Code.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the plugin structure and how to add your own.

## License

Each plugin carries its own license (MIT or WTFPL). Check the LICENSE file in each plugin directory.
