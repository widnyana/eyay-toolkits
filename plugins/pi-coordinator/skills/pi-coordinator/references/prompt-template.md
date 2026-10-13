# Worker prompt template

Fill every angle bracket yourself. The worker must not need to find anything.

```
<One line task title>. Do not explore. Read only the files named here. To find a place use `grep -n`, then read a window of 30 lines. Never read a single line, never read the same range twice. Edit with the edit tool using exact old text.

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
D. Do not run checks or tests. The driver runs them after you commit and sends you any failure; then fix only that and commit again.

Rules: at most <20 to 40> tool calls. No narration. If stuck, stop and say why in 3 lines.
Last message, exactly these lines:
commit: <hash or none>
files: <list>
uncommitted files: none|<list>

<project forbidden phrase line, if any>
```

Launch with `PI_VERIFY_CMD='<check cmd> && <test cmd>'` (the driver gate). Without it, put the check and test steps back in, each with a grep for its COMPLETED/Tests line, and ask for those lines in the final message.

## Sizing

- 1 to 3 files and under 40 tool calls: fits.
- The driver gate moves builds out of the tool count. Set `PI_TIMEOUT_MIN` to cover worker time plus 1 + `PI_VERIFY_ROUNDS` gate runs; the first `cargo check --tests` in a fresh worktree takes minutes.
- Fresh worktrees have no `node_modules`: put the install in `PI_VERIFY_CMD` (e.g. `cd lumira-suite && bun install --frozen-lockfile && bun run check && bun run test`), not in the worker steps.
- If you cannot write the exact edits, the task is not ready: investigate more, or split it.
