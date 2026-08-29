# eyay-toolkits

[![skills.sh](https://skills.sh/b/widnyana/eyay-toolkits)](https://skills.sh/widnyana/eyay-toolkits)

Claude Code plugins and pi packages for people who'd rather ship than configure.

These started as things I kept re-teaching Claude in every session -- review patterns, decimal validation traps, how to write without sounding like a press release. Eventually I packed them into skills so I could stop repeating myself. If any of them save you time, good. Steal them.

## Install

**Claude Code (plugins)** — full guide in [INSTALL.md](INSTALL.md), but the short version:

```bash
/plugin marketplace add widnyana/eyay-toolkits
/plugin install <plugin-name>@eyay-toolkits
```

**Other agents / skills.sh:**

```bash
npx skills add widnyana/eyay-toolkits
```

**pi / OMP (packages):**

```bash
pi install npm:@widnyana/design-thinking
# or
omp install npm:@widnyana/design-thinking
```

Uninstalling anything: see [UNINSTALL.md](UNINSTALL.md).

## The plugins

| Plugin | What it does | Details |
|--------|-------------|---------|
| **block-forbidden-git-add** | PreToolUse hook that blocks `git add .`/`-A`, staging protected paths (`docs/`, `CLAUDE.md`, ...), and history rewrites (`rebase`, `reset`, `commit --amend`, `push -f`). | [README](plugins/block-forbidden-git-add/README.md) |
| **bmad-sprint-run** | Drives Claude Code through an entire BMad sprint autonomously — creates stories, implements them, runs quality gates, handles retries, and commits results. Two modes: skill (`/bmad-sprint-run`) and Python companion (`sprint-runner.py`). | [README](plugins/bmad-sprint-run/README.md) |
| **career-tools** | Cover letters and CVs from repo contents. Markdown or ATS-friendly LaTeX. | [README](plugins/career-tools/README.md) |
| **design-thinking** | `/dt` mode + `/cg*` commands: draw the Design Graph (call graph, named failure paths) before writing code, review, or refactor. Claude Code port of the `design-thinking` pi package below. | [README](plugins/design-thinking/README.md) |
| **evm-decimal-validation** | Audits hardcoded decimals, queries on-chain values, fixes FromWei/ToWei conversions. Catches the "18 decimals everywhere" mistake before it hits production. | [README](plugins/evm-decimal-validation/README.md) |
| **perihbahasa** | Humorous, absurd, and flirty remixes of Indonesian proverbs (*peribahasa*) with precise rhyme and cadence. | [README](plugins/perihbahasa/README.md) |
| **prose-engineers** | Docs and articles that read like a colleague explaining something over coffee. Problem-first, concrete, no filler. Structured for how people actually read: scanning, front-loading, resumable sections. Public and internal modes. | [README](plugins/prose-engineers/README.md) |
| **solana-onchain** | Query accounts, analyze transactions, execute operations on Solana. Defaults to devnet because mainnet mistakes are permanent. | [README](plugins/solana-onchain/README.md) |
| **sui-dev-tools** | Move smart contracts, TypeScript SDK, dApp Kit, Seal secrets, Walrus storage. All the Sui things in one plugin. | [README](plugins/sui-dev-tools/README.md) |
| **ts-backend-dev** | TypeScript backend skills: kill N+1 queries, review code for architecture and security issues, design Prisma schemas that won't paint you into a corner. | [README](plugins/ts-backend-dev/README.md) |
| **visual-gen** | Blog cover images, architecture diagrams, and process infographics as PNG via HTML+CSS + Chrome headless. | [README](plugins/visual-gen/README.md) |

## pi packages

| Package | What it does | README |
|---|---|---|
| **design-thinking** | [pi](https://pi.dev) extension that flips the order: with `/dt` active, the agent draws a Design Graph (call graph, named failure paths) before writing code. Includes the `/cg`, `/cg-plan`, `/cg-review`, `/cg-map` prompt family. | [README](pi-packages/design-thinking/README.md) |

Install commands are in the [Install](#install) section above.

## visual-gen samples

| Standard (1200x630) | Wide (2400x630) | Tall (1200x2400) |
|---|---|---|
| ![Cover image](assets/cover-image-sample.png) | ![Wide diagram](assets/architecture-diagram-wide-sample.png) | ![Tall infographic](assets/process-infographic-tall-sample.png) |
| ![Architecture diagram](assets/architecture-diagram-sample.png) | | ![Process infographic](assets/process-infographic-sample.png) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the plugin structure and how to add your own.

## License

[MIT](LICENSE) -- see individual plugin directories for specifics.
