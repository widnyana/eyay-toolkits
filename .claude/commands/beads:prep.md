---
description: Interactive planning mode that creates .md plan files for later conversion to beads
allowed-tools: Read, Glob, Write, Edit, Bash(mkdir:*)
---

# Beads Prep

Interactive planning mode for creating structured .md plan files.

**Input**: $ARGUMENTS

## Mode Detection

1. If NO argument → **CREATE MODE** (new plan)
2. If plan ID provided (e.g., `be-xkq`) → **REVIEW MODE** (iterate on existing plan)

---

## CREATE MODE (No argument)

### Setup

1. Generate a unique 3-letter code for this plan:
   - Random lowercase letters (e.g., `xkq`, `bmf`, `tnr`)
   - Check `.beads/plans/` for existing plans to avoid duplicates
2. Display the context:
   ```
   Planning Mode Active
   Prefix: be- (backend)
   Plan ID: be-[abc]
   Target: .beads/plans/

   Ready to gather context. Please provide your task briefing.
   ```

### Workflow

1. **Context Gathering Phase**:
   - Listen and accumulate all information about the task
   - Ask clarifying questions if needed
   - Continue gathering until the user says **"fire the stove"**

2. **Plan Creation Phase** (triggered by "fire the stove"):
   - Ensure `.beads/plans/` directory exists
   - Create a structured .md plan file
   - Naming: `be-[abc]-[short-descriptive-name].md`
   - Example: `be-xkq-auth-refactor.md`

### Plan File Template

```markdown
# BE-[ABC]: [Title]

**Plan ID**: be-[abc]
**Project**: appreal-backend
**Type**: [feature/bug/refactor/task]
**Priority**: [0-4] (0=critical, 4=backlog)
**Status**: raw

## Overview

[Brief description of what needs to be done]

## Context

[Background information, current state, problems to solve]

## Requirements

1. [Requirement 1]
2. [Requirement 2]

## Implementation Plan

1. [Step 1]
2. [Step 2]

## Technical Details

[APIs, dependencies, considerations]

## Sub-tasks

- [ ] be-[abc].1: [Sub-task 1]
- [ ] be-[abc].2: [Sub-task 2]

## Notes

[Additional notes or decisions]
```

### Test File Convention

When the plan involves tests, use this path pattern:
- **Pattern**: `src/modules/[MODULE_NAME]/tests/[test-file].spec.ts`
- **Example**: `src/modules/invoice/tests/invoice.service.spec.ts`

### After "fire the stove"

```
Plan created: .beads/plans/be-[abc]-[name].md
Plan ID: be-[abc]

Next steps:
→ /beads:prep be-[abc]     # review & iterate on plan
→ /beads:plan be-[abc]     # convert to beads (when ready)
```

---

## REVIEW MODE (Plan ID provided)

Review and iterate on an existing plan.

### Fresh Eyes Protocol

- Treat this as a NEW review
- Apply skepticism: "What's missing or unclear?"
- Find at least 2 things that could be improved

### Review Checklist

| Aspect           | Question                                       |
| ---------------- | ---------------------------------------------- |
| **Clarity**      | Is the overview clear enough for someone new?  |
| **Completeness** | Are all requirements captured?                 |
| **Feasibility**  | Is the implementation plan realistic?          |
| **Scope**        | Is it appropriately sized?                     |
| **Sub-tasks**    | Are they atomic and actionable?                |
| **Dependencies** | Are implicit dependencies noted?               |

### Steps

1. Find and read the plan file from `.beads/plans/`
2. Evaluate against the checklist
3. Provide structured feedback:
   ```
   ## Plan Review: [plan-id]

   ### Strengths
   - [what's good]

   ### Issues Found
   - [problem 1]
   - [problem 2]

   ### Suggested Improvements
   - [specific change 1]

   ### Verdict: [ITERATE / READY FOR PLAN]
   ```
4. If ITERATE: Apply fixes directly to the plan file
5. Suggest next command:
   ```
   Next steps:
   → /beads:prep be-[abc]     # iterate again
   → /beads:plan be-[abc]     # ready to convert
   ```

---

## Important Rules

- Only create the plan file when user says "fire the stove"
- Use simple, descriptive filenames (kebab-case)
- Keep plans focused and actionable
- **Status** must be `raw` initially (changes to `processed` after `/beads:plan`)
- This is PLANNING ONLY - no implementation
