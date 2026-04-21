---
name: prisma-schema
description: |
  Create or modify Prisma schema for new entities using multi-schema by default. Use this skill when the user wants to define database models, add tables, create migrations, or design a schema with proper field types, relations, indexes, and conventions. Triggers on "prisma schema", "add model", "create table", "database schema", "define entity", or when the user mentions Prisma and needs a model defined. Covers multi-schema, soft deletes, high-precision decimals, snake_case mapping, UUID primary keys, and relation patterns.
---

# Prisma Schema

Create/modify schema for: $ARGUMENTS

## Multi-Schema Setup

Always define `schemas` in the datasource block. This enables organizing models into logical namespaces and is supported by PostgreSQL, CockroachDB, and SQL Server.

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["base", "billing", "inventory"]
}
```

Every model and enum must declare its schema with `@@schema("name")`. Pick the schema that matches the model's domain. If only one schema is needed, use a single entry like `schemas = ["public"]`.

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

  // Table and schema mapping
  @@map("entity_names")
  @@schema("base")
}

enum EntityStatus {
  ACTIVE
  INACTIVE
  DELETED

  @@schema("base")
}
```

### Cross-Schema Relations

Models in different schemas can reference each other. Both schemas must be listed in `schemas`.

```prisma
// schema: "base"
model User {
  id     Int     @id
  orders Order[]

  @@schema("base")
}

// schema: "billing"
model Order {
  id     Int  @id
  user   User @relation(fields: [userId], references: [id])
  userId Int

  @@schema("billing")
}
```

### Same Table Name, Different Schema

When two schemas have tables with the same name, use unique model names and `@@map` to disambiguate:

```prisma
model BaseConfig {
  id Int @id

  @@map("Config")
  @@schema("base")
}

model UserConfig {
  id Int @id

  @@map("Config")
  @@schema("users")
}
```

## Conventions

### Naming

- Model: PascalCase (`InvoicePayment`)
- Fields: camelCase (`accountId`)
- DB columns: snake_case via `@map("account_id")`
- Table: snake_case plural via `@@map("invoice_payments")`
- Schema: lowercase, domain-based (`"billing"`, `"inventory"`, `"auth"`)

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

### Moving Models Between Schemas

Moving a model from one schema to another drops the table in the source schema and recreates it in the target. Back up data before applying such migrations.

## Checklist

- [ ] Schema file created or modified
- [ ] `schemas` array defined in datasource block
- [ ] Every model and enum has `@@schema("...")`
- [ ] Proper field types and defaults
- [ ] Relations defined correctly (including cross-schema)
- [ ] Indexes for known query patterns
- [ ] snake_case mapping for DB columns
- [ ] Enum created if needed
- [ ] Schema validated with no errors
- [ ] Migration generated and reviewed

## References

- [Prisma Multi-Schema](https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema) -- official docs on organizing models across multiple database schemas
