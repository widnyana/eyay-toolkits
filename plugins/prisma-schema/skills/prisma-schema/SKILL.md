---
name: prisma-schema
description: |
  Create or modify Prisma schema for new entities. Use this skill when the user wants to define database models, add tables, create migrations, or design a schema with proper field types, relations, indexes, and conventions. Triggers on "prisma schema", "add model", "create table", "database schema", "define entity", or when the user mentions Prisma and needs a model defined. Covers soft deletes, high-precision decimals, snake_case mapping, UUID primary keys, and relation patterns.
---

# Prisma Schema

Create/modify schema for: $ARGUMENTS

## Schema Pattern

```prisma
model EntityName {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // Business fields
  status EntityStatus @default(ACTIVE)
  name   String
  amount Decimal      @db.Decimal(36, 18)

  // Relations
  accountId String  @map("account_id")
  account   Account @relation(fields: [accountId], references: [id])

  // Indexes
  @@index([accountId])
  @@index([status])
  @@index([createdAt])
  // Table mapping
  @@map("entity_names")
}

enum EntityStatus {
  ACTIVE
  INACTIVE
  DELETED
}
```

## Conventions

### Naming

- Model: PascalCase (`InvoicePayment`)
- Fields: camelCase (`accountId`)
- DB columns: snake_case via `@map("account_id")`
- Table: snake_case plural via `@@map("invoice_payments")`

### Common Fields

```prisma
id        String   @id @default(uuid())
createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @updatedAt @map("updated_at")
deletedAt DateTime? @map("deleted_at")  // Soft delete
```

### Decimal for Money / Crypto

```prisma
amount Decimal @db.Decimal(36, 18)  // High precision
```

Use `Decimal` for any financial value. `Float` is not acceptable for money.

### Relations

```prisma
// One-to-Many
accountId String  @map("account_id")
account   Account @relation(fields: [accountId], references: [id])

// Many-to-Many (use explicit join table for control)
```

### Indexes

```prisma
@@index([accountId])           // Foreign keys
@@index([status, createdAt])   // Common query patterns
@@unique([accountId, nonce])   // Business uniqueness constraints
```

Add indexes based on actual query patterns, not speculative.

## After Creating Schema

1. **Validate**: `prisma validate`
2. **Format**: `prisma format`
3. **Generate**: `prisma generate`
4. **Migrate**: `prisma migrate dev --name add_entity_name`

Detect the package manager from the repo (lockfile or `packageManager` in `package.json`) and prefix commands accordingly (`npx`, `pnpm exec`, `yarn exec`, `bunx`, or direct if globally installed).

## Checklist

- [ ] Schema file created or modified
- [ ] Proper field types and defaults
- [ ] Relations defined correctly
- [ ] Indexes for known query patterns
- [ ] snake_case mapping for DB columns
- [ ] Enum created if needed
- [ ] Schema validated with no errors
- [ ] Migration generated and reviewed
