# exit-commands

pi / omp extension that adds vim muscle-memory exits to the REPL:

| Input | Effect |
|---|---|
| `:q` `:q!` `:wq` `:wq!` `:x` `:xq` | Gracefully exit the REPL |
| `/exit` | Gracefully exit the REPL |

`/quit` is already built into both pi and omp; `/exit` is not. This package
adds `/exit` and the vim-style input aliases. All paths use `ctx.shutdown()` —
the sanctioned graceful-exit call (same as Ctrl+D). If the agent is streaming,
the run is aborted first. `:wq`/`:x` are plain synonyms: pi autosaves sessions,
so "write" is a no-op.

Non-matching input passes through to the agent untouched — a message that
merely contains `:q` is never intercepted (matching is exact, on the trimmed
full line).

## Install

```bash
pi install npm:@widnyana/exit-commands
# or via OMP
omp install npm:@widnyana/exit-commands
```

From a local checkout:

```bash
pi install /path/to/eyay-toolkits/pi-packages/exit-commands
# or via OMP
omp install /path/to/eyay-toolkits/pi-packages/exit-commands
```
