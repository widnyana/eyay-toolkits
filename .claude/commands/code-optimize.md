---
description: Optimize code for performance, readability, or maintainability
model: sonnet
---

# Code Optimization

Optimize: $ARGUMENTS

## Optimization Areas

### 1. Database Query Optimization

**N+1 Query Problem**

```typescript
// Bad: N+1 queries
const invoices = await this.repository.findMany();
for (const invoice of invoices) {
  invoice.account = await this.accountRepository.findOne(invoice.accountId);
}

// Good: Single query with include
const invoices = await this.repository.findMany({
  include: { account: true },
});
```

**Select Only Needed Fields**

```typescript
// Bad: Select all columns
const accounts = await this.repository.findMany();

// Good: Select specific fields
const accounts = await this.repository.findMany({
  select: { id: true, email: true, status: true },
});
```

**Use Pagination**

```typescript
const { data, pagination } = await this.repository.findAndCount({
  where: { status: "ACTIVE" },
  page: 1,
  limit: 50,
});
```

### 2. Caching Optimization

**Use Repository Cache**

```typescript
const account = await this.accountRepository.findUniqueWithCache(
  { where: { id } },
  `account:${id}`,
  300, // TTL in seconds
  true, // enable cache
);
```

**Cache Expensive Computations**

```typescript
const cacheKey = `exchange-rate:${from}:${to}`;
const cached = await this.redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const rate = await this.calculateRate(from, to);
await this.redis.set(cacheKey, JSON.stringify(rate), "EX", 60);
return rate;
```

### 3. Transaction Optimization

**Batch Operations**

```typescript
// Bad: Individual updates
for (const item of items) {
  await this.repository.update({ where: { id: item.id }, data: item });
}

// Good: Transaction batch
await this.repository.executeTransactionWithRetry(async (tx) => {
  await Promise.all(
    items.map((item) =>
      tx.entity.update({ where: { id: item.id }, data: item }),
    ),
  );
});
```

### 4. Code Structure Optimization

**Early Returns**

```typescript
// Bad: Nested conditions
async process(data) {
  if (data) {
    if (data.isValid) {
      // logic
    }
  }
}

// Good: Early returns
async process(data) {
  if (!data) return;
  if (!data.isValid) return;
  // logic
}
```

**Extract Repeated Logic**

```typescript
// Bad: Repeated validation
if (!invoice) throw new NotFoundException('Invoice not found');
if (!payout) throw new NotFoundException('Payout not found');

// Good: Reusable helper
private ensureFound<T>(entity: T | null, name: string): T {
  if (!entity) throw new NotFoundException(`${name} not found`);
  return entity;
}
```

### 5. Race Condition Prevention (Financial Services)

**CRITICAL** for balance updates, payouts, invoices, trades, withdrawals.

**Distributed Lock + Transaction**

```typescript
// Bad: No locking - race condition vulnerable
const balance = await this.balanceRepo.findOne({ accountId });
balance.amount += amount;
await this.balanceRepo.update(balance);

// Good: Redis lock + atomic transaction
const lockKey = `balance:${accountId}`;
const lock = await this.redis.acquireLock(lockKey, 30000);
try {
  await this.repository.executeTransactionWithRetry(
    async (tx) => {
      await tx.$executeRaw`
      UPDATE "AccountBalance"
      SET amount = amount + ${amount}
      WHERE account_id = ${accountId}
    `;
    },
    { isolationLevel: "Serializable" },
  );
} finally {
  await this.redis.releaseLock(lockKey, lock);
}
```

**Idempotency for Webhooks/External APIs**

```typescript
const idempotencyKey = `payout:${payoutId}`;
if (await this.redis.get(idempotencyKey)) return; // Already processed
await this.redis.set(idempotencyKey, "processing", "EX", 3600);
// Process...
await this.redis.set(idempotencyKey, "completed", "EX", 86400);
```

### 6. Async Optimization

**Parallel Execution**

```typescript
// Bad: Sequential
const account = await this.accountService.find(id);
const wallet = await this.walletService.find(id);

// Good: Parallel
const [account, wallet] = await Promise.all([
  this.accountService.find(id),
  this.walletService.find(id),
]);
```

## Checklist

- [ ] Identify performance bottleneck
- [ ] Check for N+1 queries
- [ ] Review caching opportunities
- [ ] Look for parallel execution opportunities
- [ ] Simplify complex logic
- [ ] Remove code duplication
- [ ] Check for race conditions in financial operations (use locks + transactions)
- [ ] Verify optimization doesn't break functionality
- [ ] Measure improvement (if possible)
