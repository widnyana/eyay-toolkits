---
name: code-optimize
description: |
  Optimize TypeScript code that interacts with databases. Use this skill when the user wants to fix N+1 queries, add caching, improve transaction safety, prevent race conditions, simplify async flows, or generally speed up a TypeScript backend. Triggers on phrases like "optimize", "slow query", "N+1", "race condition", "caching", "performance", "bottleneck", or when the user points at TypeScript code that reads or writes to a database and asks for improvements.
---

# TypeScript Database Optimization

Optimize: $ARGUMENTS

## 1. N+1 Query Elimination

The classic trap: fetching a list, then querying per item in a loop.

```typescript
// N+1: one query for the list, one per item
const orders = await db.order.findMany();
for (const order of orders) {
  order.customer = await db.customer.findUnique({ where: { id: order.customerId } });
}

// Resolved: single query with join/include
const orders = await db.order.findMany({
  include: { customer: true },
});
```

If the ORM doesn't support `include`, use a `WHERE id IN (...)` or a JOIN.

## 2. Select Only What You Need

```typescript
// Over-fetching
const users = await db.user.findMany();

// Tight select
const users = await db.user.findMany({
  select: { id: true, email: true },
});
```

Applies to raw SQL too -- avoid `SELECT *` when you only need a few columns.

## 3. Pagination

Always paginate list endpoints. Cursor-based for large/real-time datasets, offset-based for simple cases.

```typescript
// Offset-based
const [data, total] = await Promise.all([
  db.user.findMany({ skip: (page - 1) * limit, take: limit }),
  db.user.count(),
]);

// Cursor-based (no count query, stable under writes)
const items = await db.message.findMany({
  take: limit,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: "desc" },
});
```

## 4. Caching

Cache where data is read-heavy and stale reads are tolerable.

```typescript
async function getExchangeRate(from: string, to: string): Promise<number> {
  const key = `rate:${from}:${to}`;
  const cached = await cache.get(key);
  if (cached !== null) return Number(cached);

  const rate = await fetchRateFromAPI(from, to);
  await cache.set(key, String(rate), { ttl: 60 }); // 60s TTL
  return rate;
}
```

For repository-level caching, wrap the lookup:

```typescript
async findById(id: string): Promise<User | null> {
  const cached = await cache.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.user.findUnique({ where: { id } });
  if (user) await cache.set(`user:${id}`, JSON.stringify(user), { ttl: 300 });
  return user;
}
```

Invalidate on writes. Prefer short TTLs over complex invalidation logic.

## 5. Batch Writes in Transactions

```typescript
// Sequential writes outside a transaction -- slow and non-atomic
for (const item of items) {
  await db.item.update({ where: { id: item.id }, data: item });
}

// Batched in a transaction -- fast and atomic
await db.$transaction(
  items.map((item) =>
    db.item.update({ where: { id: item.id }, data: item })
  )
);
```

For large batches, chunk to avoid exceeding connection limits or statement size:

```typescript
const CHUNK = 100;
for (let i = 0; i < items.length; i += CHUNK) {
  await db.$transaction(
    items.slice(i, i + CHUNK).map((item) =>
      db.item.update({ where: { id: item.id }, data: item })
    )
  );
}
```

## 6. Race Condition Prevention

Critical for balance updates, inventory, counters -- anything that reads-then-writes.

**Optimistic locking** (version column):

```typescript
const result = await db.account.update({
  where: { id: accountId, version: currentVersion },
  data: { balance: newBalance, version: { increment: 1 } },
});
if (!result) throw new ConflictError("Concurrent modification");
```

**Atomic updates** (no read needed):

```typescript
await db.account.update({
  where: { id: accountId },
  data: { balance: { increment: amount } },
});
```

**Distributed lock** (Redis/Valkey, for cross-service coordination):

```typescript
const lock = await acquireLock(`balance:${accountId}`, 30_000);
try {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE account SET balance = balance + ${amount} WHERE id = ${accountId}
    `;
  });
} finally {
  await releaseLock(`balance:${accountId}`, lock);
}
```

**Idempotency** (webhooks, retries):

```typescript
const key = `processed:${eventId}`;
if (await cache.get(key)) return { status: "already_processed" };
await cache.set(key, "processing", { ttl: 3600 });
// ... do work ...
await cache.set(key, "done", { ttl: 86_400 });
```

## 7. Parallel Async

Independent lookups should run concurrently.

```typescript
// Sequential -- 2 round-trips
const user = await db.user.findUnique({ where: { id } });
const settings = await db.settings.findUnique({ where: { userId: id } });

// Parallel -- 1 round-trip wall time
const [user, settings] = await Promise.all([
  db.user.findUnique({ where: { id } }),
  db.settings.findUnique({ where: { userId: id } }),
]);
```

Use `Promise.allSettled` when partial failures are acceptable.

## 8. Simplify Control Flow

**Early returns** over nesting:

```typescript
// Nested
async function process(data: Input | null) {
  if (data) {
    if (data.valid) {
      // actual logic
    }
  }
}

// Flat
async function process(data: Input | null) {
  if (!data || !data.valid) return;
  // actual logic
}
```

**Extract helpers** for repeated patterns:

```typescript
function ensureFound<T>(value: T | null | undefined, label: string): T {
  if (value == null) throw new NotFoundError(`${label} not found`);
  return value;
}
```

## Checklist

- [ ] Identify the bottleneck (profile, don't guess)
- [ ] Eliminate N+1 queries
- [ ] Add pagination to list endpoints
- [ ] Tighten selects to needed fields only
- [ ] Cache read-heavy, staleness-tolerant data
- [ ] Batch writes in transactions
- [ ] Chunk large batches
- [ ] Guard read-then-write with optimistic locking or atomic updates
- [ ] Use distributed locks for cross-service coordination
- [ ] Add idempotency keys for webhooks
- [ ] Parallelize independent async work
- [ ] Verify optimization doesn't change behavior
