---
description: Load beads workflow context and show ready tasks with option to start working
allowed-tools: Bash(bd:*)
---

# Beads Bootstrap

Load beads workflow context and show ready tasks.

## Steps

1. Run `bd prime` to load AI-optimized workflow context
2. Run `bd ready` to show unblocked tasks ready to work on
3. Ask the user which task they want to work on (or skip)
   - Show the ready tasks as options
   - User can press Enter to select, or choose "Skip" to exit
4. If user selects a task, run `bd show <task-id>` to display full details

## Output Format

```
Ready Tasks:
[list from bd ready]

Select a task to begin work, or type "skip" to exit.
```

## Related Commands

- `/beads:prep` - Create a new plan
- `/beads:plan <id>` - Convert a plan to beads issues
- `/beads:review <id>` - Review and polish beads before implementation
