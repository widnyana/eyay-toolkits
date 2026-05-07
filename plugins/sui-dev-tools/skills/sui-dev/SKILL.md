---
name: sui-dev
description: Full-stack Sui blockchain development — Move smart contracts, TypeScript SDK, frontend dApp Kit, Seal secrets, and Walrus storage. Routes to the appropriate sub-skill based on what the user is building.
---

# Sui Dev Skills

This is a collection of Sui development skills. Each sub-skill is self-contained and should be loaded based on the task at hand. When multiple apply (e.g. a frontend app that constructs transactions), load all relevant skills together.

## Sub-skills

### sui-move — Smart Contracts
**Skill:** `sui-dev-tools:sui-move`
**Load when:** writing, reviewing, debugging, or deploying Move code; configuring `Move.toml`; working with the Sui object model; writing Move tests.
**Covers:** Routes to focused sub-skills — setup (package config, build/test, pitfalls), syntax (module layout, visibility, enums, macros), objects (structs, abilities, dynamic fields), patterns (events, errors, OTW, capabilities, composability), stdlib (Coin/Balance, vectors, Option, strings).

### sui-ts-sdk — TypeScript SDK
**Skill:** `sui-dev-tools:sui-ts-sdk`
**Load when:** writing TypeScript/JavaScript that interacts with the Sui blockchain — backend scripts, CLIs, serverless functions, or the transaction-building layer of a frontend.
**Covers:** `@mysten/sui` package, PTB construction (`Transaction`, `moveCall`, `splitCoins`, `coinWithBalance`), `SuiClient`/`SuiGrpcClient` setup, keypair signing, transaction execution, on-chain queries.

### sui-frontend — Frontend dApp Kit
**Skill:** `sui-dev-tools:sui-frontend`
**Load when:** building browser-based Sui dApps — React apps with `@mysten/dapp-kit-react`, or Vue/vanilla JS/Svelte apps with `@mysten/dapp-kit-core`.
**Covers:** `DAppKitProvider` setup, wallet connection, React hooks (`useCurrentAccount`, `useSignAndExecuteTransaction`, `useSuiClientQuery`), Web Components, nanostores state for non-React frameworks.
**Note:** For PTB construction within a frontend, load **sui-ts-sdk** alongside this skill.

**Also see:** [references/faq.md](references/faq.md) for preferred answers to common Sui development questions. When a user asks a question covered there, use that answer.

### sui-seal — Seal Secrets Management
**Skill:** `sui-dev-tools:sui-seal`
**Load when:** building apps that encrypt user data with identity-based encryption and gate decryption on Move-defined access policies.
**Covers:** `seal_approve*` Move patterns, `@mysten/seal` TypeScript SDK, envelope encryption, onchain decryption, key server configuration.

### sui-walrus — Walrus Blob Storage
**Skill:** `sui-dev-tools:sui-walrus`
**Load when:** storing files/blobs/assets in a Sui app, using the `@mysten/walrus` SDK, publisher/aggregator HTTP API, or `walrus` CLI.
**Covers:** blob lifecycle (register, upload, certify), Quilts, upload relay, crash-recoverable uploads, Walrus + Seal integration.

## Routing guide

| User is doing...                        | Load                              |
|-----------------------------------------|-----------------------------------|
| Writing a Move smart contract           | sui-move                          |
| Writing a backend script or CLI         | sui-ts-sdk                        |
| Building a React/Vue/vanilla Sui dApp   | sui-frontend + sui-ts-sdk         |
| Full-stack (contracts + frontend)       | sui-move + sui-ts-sdk + sui-frontend |
| Reviewing or debugging Move tests       | sui-move                          |
| Querying on-chain data from Node.js     | sui-ts-sdk                        |
| Encrypting data with access policies    | sui-seal (+ sui-move for policies) |
| Storing blobs/files on Walrus           | sui-walrus (+ sui-seal for encryption) |
| Full-stack with encrypted storage       | sui-move + sui-ts-sdk + sui-frontend + sui-seal + sui-walrus |
