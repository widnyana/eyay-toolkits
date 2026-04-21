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
- **[ts-db-perf](./plugins/ts-db-perf)** — Optimize TypeScript code that interacts with databases. N+1 queries, caching, transactions, race conditions, async patterns.
- **[ts-review](./plugins/ts-review)** — Review TypeScript code for quality, security, and correctness with a structured checklist.
- **[prisma-schema](./plugins/prisma-schema)** — Create or modify Prisma schema with proper conventions, relations, and indexes.
- **[worktree-new](./plugins/worktree-new)** — Create git worktrees with isolated ports for parallel development.
