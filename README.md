# eyay-toolkits

Personal Claude Code plugins. Built for shipping systems, not essays. If it helps you, steal it.

## Table of Contents

- [Setup](#setup)
- [Plugins](#plugins)
  - [career-tools](#career-tools)
  - [evm-decimal-validation](#evm-decimal-validation)
  - [solana-onchain](#solana-onchain)
  - [technical-writer](#technical-writer)
  - [ts-backend-dev](#ts-backend-dev)

## Setup

Add this marketplace to Claude Code:

```bash
/plugin marketplace add widnyana/eyay-toolkits
```

---

## Plugins

### career-tools

Build career documents from repo content: cover letters (`cover-letter-builder`) and CVs (`cv-builder`) in Markdown or LaTeX.

```bash
/plugin install career-tools@eyay-toolkits
```

---

### evm-decimal-validation

Validate token decimals across EVM chains to prevent amount calculation errors.

```bash
/plugin install evm-decimal-validation@eyay-toolkits
```

---

### solana-onchain

Solana blockchain integration: query accounts, analyze transactions, execute operations with mainnet safety safeguards.

```bash
/plugin install solana-onchain@eyay-toolkits
```

---

### technical-writer

Write technical docs and articles in a storytelling style that's direct, easy to read, and problem-first.

```bash
/plugin install technical-writer@eyay-toolkits
```

---

### ts-backend-dev

TypeScript backend development: database performance optimization (`ts-db-perf`), code review (`ts-review`), and Prisma schema design (`prisma-schema`).

```bash
/plugin install ts-backend-dev@eyay-toolkits
```
