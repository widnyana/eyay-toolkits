---
description: Meta Research Prompt Generator - writes ./research/projects/<NAME>/.<NAME>.research.prompt and prints the command to run it
argument-hint: "<NAME or topic line> [REFS: ...] [DEPENDS_ON: ...] [context]"
allowed-tools: Read, Write, Bash(mkdir:*), Bash(test:*), Bash(ls:*)
---
@${CLAUDE_PLUGIN_ROOT}/references/meta-research.md

---

You run inside Claude Code: in step 8 print only the Claude Code command.

User message:
$ARGUMENTS
