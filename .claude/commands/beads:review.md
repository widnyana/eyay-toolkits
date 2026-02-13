---
description: Review and polish beads to ensure smooth implementation
allowed-tools: Bash(bd:*), Read, Glob
---

# Beads Review

Review, proofread, and polish beads to ensure smooth implementation.

**Input**: $ARGUMENTS (Plan ID or bead IDs)

## Fresh Eyes Protocol

**CRITICAL**: If you have previously reviewed these beads:

- Disregard all prior assessments
- Assume your first review missed something
- Actively look for problems (devil's advocate mode)
- Find at least 2 potential issues per bead
- Do NOT say "looks good" without specific evidence

## Steps

1. **Find the beads to review**:
   - If plan ID provided: Find plan in `.beads/plans/`, read `## Beads Created` section
   - If bead IDs provided: Use those directly
   - If unclear: Run `bd list --status=open` to see available beads

2. **Review each bead** with `bd show <id>`:

   | Aspect           | Question                                  |
   | ---------------- | ----------------------------------------- |
   | **Clarity**      | Is the title clear and actionable?        |
   | **Completeness** | Does description have all needed context? |
   | **Acceptance**   | Are success conditions defined?           |
   | **Dependencies** | Are blockers correctly set up?            |
   | **Scope**        | Is the task appropriately sized?          |

3. **Check for issues**:
   - Ambiguous requirements
   - Missing edge cases
   - Unclear technical approach
   - Missing or incorrect dependencies

4. **Apply improvements** using `bd update <id>`:
   - Clearer titles
   - More detailed descriptions
   - Better acceptance criteria
   - Fixed dependencies

5. **Summarize changes** and any remaining concerns

## Output Format

```
## Beads Review Summary

### Reviewed
- [bead-id]: [status - PASS/UPDATED/NEEDS WORK]
- [bead-id]: [status]

### Changes Made
- [bead-id]: [what was updated]

### Remaining Concerns
- [any issues that need user input]

### Ready for Implementation
[list of beads ready to work on]

Next steps:
→ bd ready             # see what's unblocked
→ bd show <id>         # start working on a task
```

## Related Commands

- `/beads:prep` - Create or iterate on a plan
- `/beads:plan` - Convert plan to beads
- `/beads:bootstrap` - See ready tasks
