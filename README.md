# eyay-toolkits

Personal Claude Code plugins. Built for shipping systems, not essays. If it helps you, steal it.

## Installation

Add this marketplace to Claude Code:

```bash
/plugin marketplace add widnyana/eyay-toolkits
```

Then install plugins:

```bash
/plugin install technical-writer@eyay-toolkits
```

## Plugins

- **[technical-writer](./plugins/technical-writer)** — Write technical docs and articles in a storytelling style that's direct, easy to read, and problem-first.
- **[evm-decimal-validation](./plugins/evm-decimal-validation)** — Validate token decimals across EVM chains to prevent amount calculation errors.
- **[ts-backend-dev](./plugins/ts-backend-dev)** — TypeScript backend development: database performance optimization (`ts-db-perf`), code review (`ts-review`), and Prisma schema design (`prisma-schema`).
- **[worktree-new](./plugins/worktree-new)** — Create git worktrees with isolated ports for parallel development.
