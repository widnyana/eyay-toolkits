---
name: code-review
description: |
  Review TypeScript code for quality, security, and correctness. Use this skill when the user asks for a code review, wants feedback on a PR or diff, or says "review this". Covers architecture, security, error handling, database patterns, type safety, and code quality. Produces categorized findings: critical issues, improvements, suggestions, and positive notes. Also triggers on phrases like "check this code", "what do you think of this", or "any issues with".
---

# Code Review

Review: $ARGUMENTS

## Review Checklist

### 1. Architecture & Patterns

- [ ] Clear separation of concerns (routing, business logic, data access)
- [ ] Dependency injection or explicit dependencies (no hidden globals)
- [ ] Service/module layer handles business logic, not handlers/controllers
- [ ] Input validation at the boundary (DTOs, schemas, zod, class-validator)

### 2. Security

- [ ] Auth checks on sensitive endpoints
- [ ] Role-based or scope-based access control where needed
- [ ] No hardcoded secrets, credentials, or API keys
- [ ] Input validation and sanitization on all public inputs
- [ ] Parameterized queries (no string interpolation in SQL)
- [ ] Webhook signature verification
- [ ] No sensitive data in logs or error responses

### 3. Error Handling

- [ ] Errors are properly typed and propagated
- [ ] Error messages don't leak internals to clients
- [ ] External service calls wrapped in try-catch
- [ ] Graceful degradation where appropriate
- [ ] No swallowed errors (empty catch blocks)

### 4. Database

- [ ] Transactions for multi-step operations
- [ ] Proper indexing for query patterns
- [ ] No N+1 queries
- [ ] Connection handling (pools, timeouts, cleanup)

### 5. TypeScript-Specific

- [ ] No `any` without justification
- [ ] Proper type annotations on public APIs
- [ ] Discriminated unions over optional sprawl
- [ ] Null/undefined handled explicitly (no implicit `!` abuse)
- [ ] Generics used where they add value, not everywhere

### 6. Code Quality

- [ ] Single responsibility per function/class
- [ ] No duplicated logic that should be shared
- [ ] Descriptive names (no `data`, `info`, `result` as sole identifiers)
- [ ] No dead code or unreachable branches
- [ ] Consistent style with the rest of the codebase

## Output Format

Provide:

1. **Summary**: Overall assessment in 1-2 sentences
2. **Critical Issues**: Must fix before merge
3. **Improvements**: Should fix
4. **Suggestions**: Nice to have
5. **Positive Notes**: What's done well
