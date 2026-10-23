---
description: Meta Research Prompt Generator - writes the research prompt, then runs it here or delegates it to claude, pi, or omp (DELEGATE:)
argument-hint: "<NAME or topic line> [REFS: ...] [DEPENDS_ON: ...] [DELEGATE: here|claude|pi|omp|print] [context]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, Monitor, WebFetch, WebSearch
---
@${CLAUDE_PLUGIN_ROOT}/references/meta-research.md

---

You run inside Claude Code. Origin harness: claude. For step 9, use the Claude Code column of the
tools table: `Agent` with `run_in_background: true`, `Bash` with `run_in_background: true`, and
`Monitor`.

User message:
$ARGUMENTS
