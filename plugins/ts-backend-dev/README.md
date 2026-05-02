# ts-backend-dev

TypeScript backend development skills: database performance optimization, code review, and Prisma schema design.

## Install

```bash
/plugin install ts-backend-dev@eyay-toolkits
```

## Skills

### ts-db-perf -- Database Performance Optimization

Fix N+1 queries, add caching, improve transaction safety, prevent race conditions, and speed up TypeScript backends.

**Trigger:** "optimize", "slow query", "N+1", "race condition", "caching", "bottleneck"

**Covers:**
- N+1 query elimination
- Select optimization (avoid over-fetching)
- Pagination (cursor-based and offset-based)
- Caching strategies
- Batch writes in transactions
- Race condition prevention (optimistic locking, atomic updates, distributed locks)
- Parallel async patterns
- Control flow simplification

### ts-review -- Code Review

Review TypeScript code for quality, security, and correctness. Produces categorized findings.

**Trigger:** "review this", "check this code", "any issues with", "PR feedback"

**Covers:**
- Architecture and separation of concerns
- Security (auth, input validation, SQL injection, secrets)
- Error handling
- Database patterns (transactions, indexing, N+1)
- TypeScript-specific (type safety, generics, null handling)
- Code quality (SRP, duplication, naming)

### prisma-schema -- Prisma Schema Design

Create or modify Prisma schemas with multi-schema support, soft deletes, high-precision decimals, and proper conventions.

**Trigger:** "prisma schema", "add model", "create table", "define entity"

**Covers:**
- Multi-schema setup (`@@schema`)
- Cross-schema relations
- UUID primary keys
- snake_case column mapping
- Decimal fields for money/crypto
- Indexing for query patterns
- Migration workflow
