---
name: prisma-schema
description: |
  Create or modify Prisma schema for a new entity. Use this skill when the user wants to define database models with proper field types, relations, indexes, and conventions including soft deletes, high-precision decimals, snake_case mapping, and UUID primary keys.
---

# Prisma Schema

Create/modify schema for: $ARGUMENTS

## Schema Location

Create new schema file at: `prisma/schema/{entity-name}.prisma`

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

### Decimal for Money

```prisma
amount Decimal @db.Decimal(36, 18)  // High precision for crypto
```

### Relations

```prisma
// One-to-Many
accountId String  @map("account_id")
account   Account @relation(fields: [accountId], references: [id])

// Many-to-Many (use explicit join table)
```

### Indexes

```prisma
@@index([accountId])           // Foreign keys
@@index([status, createdAt])   // Common queries
@@unique([accountId, nonce])   // Business uniqueness
```

## After Creating Schema

1. **Validate**: `pnpm prisma:validate`
2. **Generate**: `pnpm prisma:generate`
3. **Migrate**: `pnpm prisma:migrate:dev --name add_entity_name`
4. **Create Repository**: `src/database/repositories/{entity}.repository.ts`

## Checklist

- [ ] Schema file created in `prisma/schema/`
- [ ] Proper field types and defaults
- [ ] Relations defined correctly
- [ ] Indexes for query patterns
- [ ] snake_case mapping for DB
- [ ] Enum created if needed
- [ ] Schema validated
- [ ] Migration created
- [ ] Repository created

## Documentation Update

**IMPORTANT**: After creating the schema, update the module's documentation:

- **Update**: `src/modules/{module}/docs/ARCHITECTURE.md` with the new database schema details
