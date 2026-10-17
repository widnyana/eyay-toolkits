# Worker prompt template

Fill every angle bracket yourself. The worker must not need to find anything. Include the absolute worktree path — the worker edits only inside it.

```
Work in <absolute worktree path>. Do not explore. Read only the files named here. To find a place use `grep -n`, then read a window of 30 lines. Never read a single line, never read the same range twice. Edit with the edit tool using exact old text.

Fact: <what is wrong, with the evidence: the exact error, the Rust/TS/SQL shape that proves it>.

Edits:
1. In `<path>` near line <n>: change
   `<exact old text>`
   to
   `<exact new text>`
2. <next edit>
(Add a test: file, what it asserts, which existing test to open ONCE for style.)

Steps:
A. Make the edits. One `edit` call per file, with every change for that file in its `edits` array.
B. Format only what you changed: `rustfmt --edition 2024 <changed .rs files>` (never plain `cargo fmt`).
C. Stage the changed files by explicit path, `git status --short` (nothing may stay uncommitted), commit. Subject: `<type(scope): max 50 chars>` ; body: one or two sentences. No Co-Authored-By line.
D. Do not run checks or tests. The coordinator runs them after you commit and sends you any failure; then fix only that and commit again.

Rules: at most <20 to 40> tool calls. No narration. If stuck, stop and say why in 3 lines.
Last message, exactly these lines:
commit: <hash or none>
files: <list>
uncommitted files: none|<list>

<project forbidden phrase line, if any>
```

## Sizing

- 1 to 3 files and under 40 tool calls: fits.
- Checks live on the coordinator side (step 6 of the workflow / `VERIFY_CMD` on `land.sh`), so they cost the worker zero turns. Put the install step in the gate command (e.g. `bun install --frozen-lockfile && bun run check && bun run test`) — fresh worktrees have no `node_modules` (unless the coordinator seeded them — it should).
- The gate is scoped to your changed files and judged as **no new failures vs baseline**: pre-existing failures in the gate output are not the worker's problem. Say so in the prompt when the baseline is dirty.
- If the gate sends a failure back, the worker keeps its context — quote the last 40 lines verbatim plus the exact fix, and only the part it must fix.
- If you cannot write the exact edits, the task is not ready: investigate more, or split it.

## New-file variant

For creating a file that does not exist (the coordinator supplies the content; the worker types, formats, and commits):

```
Work in <absolute worktree path>. Create `<path>` with exactly this content (adjust imports to the project's conventions if needed):

<full file content, or the precise skeleton plus which symbols to fill from which named file>

Steps:
A. Write the file. B. Format it per the project's convention (<command>). C. Stage by explicit path, `git status --short`, commit — subject `<type(scope): max 50 chars>`, no Co-Authored-By line.

Rules: at most <10> tool calls. No narration. Do not run checks or tests — the coordinator runs them.
Last message, exactly: commit: <hash> / files: <path> / uncommitted files: none
```

If you cannot supply near-complete content for a new file, do not delegate it — write it yourself (see SKILL.md, "When NOT to delegate").
