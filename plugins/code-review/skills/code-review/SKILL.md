---
name: code-review
description: |
  Review code for quality, security, and adherence to project patterns. Use this skill when the user wants a structured code review covering architecture, security, error handling, database patterns, code quality, and project-specific conventions. Produces categorized findings: critical issues, improvements, suggestions, and positive notes.
---

# Code Review

Review: $ARGUMENTS

## Review Checklist

### 1. Architecture & Patterns

- [ ] Follows NestJS module structure
- [ ] Uses repository pattern (extends BaseRepository)
- [ ] Proper dependency injection
- [ ] Service layer handles business logic (not controller)
- [ ] DTOs use class-validator decorators

### 2. Security

- [ ] Authentication guards on sensitive endpoints
- [ ] Role-based access control where needed
- [ ] No hardcoded secrets/credentials
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma handles this)
- [ ] Webhook signature validation

### 3. Error Handling

- [ ] Uses HttpException for API errors
- [ ] Proper error messages (not exposing internals)
- [ ] Try-catch for external service calls
- [ ] Graceful degradation where appropriate

### 4. Database

- [ ] Uses transactions for multi-step operations
- [ ] Proper indexing considered
- [ ] No N+1 query issues
- [ ] Uses `executeTransactionWithRetry` for critical ops

### 5. Code Quality

- [ ] Single responsibility principle
- [ ] No code duplication
- [ ] Meaningful variable/function names
- [ ] No `any` types without justification
- [ ] Proper TypeScript types

### 6. Project-Specific Rules

- [ ] Uses AWS Cognito (NOT Clerk)
- [ ] Uses Privy + Nitro for wallets (NOT Xellar)
- [ ] Uses ResponseInterceptor format
- [ ] Swagger documentation present
- [ ] Follows file naming conventions

## Output Format

Provide:

1. **Summary**: Overall assessment
2. **Critical Issues**: Must fix before merge
3. **Improvements**: Should fix
4. **Suggestions**: Nice to have
5. **Positive Notes**: What's done well
