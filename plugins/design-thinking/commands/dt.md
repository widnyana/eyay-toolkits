---
description: "Design Thinking mode: /dt toggles, on|off|status set/query, anything else runs as a prompt with mode on"
argument-hint: "[on|off|status|<prompt>]"
allowed-tools: Read, Write, Bash(mkdir:*), Bash(test:*)
---
Argument: $ARGUMENTS

State file: `.claude/design-thinking.local.md` — YAML frontmatter
`enabled: true|false`, e.g.:

```markdown
---
enabled: true
---
```

Current state: !`test -f .claude/design-thinking.local.md && cat .claude/design-thinking.local.md || echo "(no state file — enabled: false)"`

Do the following:

1. Read the `enabled` value from the state shown above. Treat it as `false`
   if the file doesn't exist.
2. Classify the argument (case-insensitive, trimmed):
   - Empty → **toggle**: flip `enabled`.
   - `on` → set `enabled: true`.
   - `off` → set `enabled: false`.
   - `status` → **do not write anything.** Report "Design Thinking mode: on"
     or "Design Thinking mode: off" and stop here.
   - Anything else → set `enabled: true` (never off, regardless of current
     state) and remember the full argument text as `<prompt>` for step 5.
3. Unless the branch was `status`, write the new value to
   `.claude/design-thinking.local.md` (create the `.claude/` directory first
   if it doesn't exist) using exactly this format:
   ```markdown
   ---
   enabled: <true|false>
   ---
   ```
4. Notify the user of the resulting mode:
   - Turned on: "Design Thinking ON — plans and reviews will render as Design
     Graphs (Graph Protocol)."
   - Turned off: "Design Thinking OFF."
5. If step 2 captured a `<prompt>`, continue in this same turn: work on
   `<prompt>`, but first present the Design Graph (Graph Protocol format —
   see this plugin's `graph-protocol`, `design-method`, and `design-graph`
   skills) plus any clarifying questions. Implement only after the user's
   go-ahead.

Design Thinking mode persists across restarts via the state file above: this
plugin's `SessionStart` hook re-announces the mode at the start of every new
session while `enabled: true`. Turn it off any time with `/dt off`.
