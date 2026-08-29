# design-thinking

AI coding agents ship code before asking what breaks. This plugin flips the
order: with `/dt` active, plans and reviews draw the call graph first — nodes
are functions, edges are data flow, every failure path is named — then code
follows that *is* the graph. Plans, reviews, and refactors render in a fixed,
mechanically checkable notation (Graph Protocol) that looks the same in Go,
Rust, Python, or TypeScript.

Method by [r17x](https://github.com/r17x) ([Design Thinking
gist](https://gist.github.com/r17x/90eb2f7be93932b5693753aedb09c01a),
originally Effect-TS), generalized into this stack-agnostic Claude Code
plugin. Also available as a [pi](https://pi.dev)/OMP package —
`pi-packages/design-thinking` in this repo. Licensed MIT — see
[LICENSE](LICENSE).

## Why

A prose plan doesn't survive contact with review. An agent proposes "add
rate limiting, handle errors," the plan reads fine, and the diff either
matches it or it doesn't — prose gives no way to check which. Two failure
modes follow from that: the agent picks an unstated failure path (swallow
the error, retry silently, drop the request) nobody agreed to, or the
reviewer approves a plan that was never specific enough to catch the
mismatch once the code lands.

Design Graph replaces the prose plan with something that can be diffed.
Nodes are functions, edges are data and error/escape paths, boundaries are
named — fixed before code exists. `/cg-review` then reconstructs the graph
the code actually implements and diffs it against the one that was planned,
finding by finding, ending in a VERDICT. The notation is the same shape in
Go, Rust, Python, or TypeScript, so the check doesn't depend on the stack.

Skip it for a one-line fix — prose is fine there. Reach for `/dt` when the
change has a failure path worth agreeing on before it's written.

## Install

```bash
/plugin install design-thinking@eyay-toolkits
```

## Usage

| Command | What it does |
|---|---|
| `/dt` | Toggle Design Thinking mode. While on, plans and reviews render as Design Graphs. Persists across restarts. |
| `/dt on\|off\|status` | Set or query the mode explicitly. |
| `/dt <prompt>` | Turn the mode **on** (never off), then run `<prompt>` under it — graph and clarifying questions first, implementation after your go-ahead. |
| `/cg <module \| task>` | Generate a call graph: extract the graph existing code implements, or sketch one for a task. |
| `/cg-plan <task>` | Design before code — full Design Graph, then implement to match it. |
| `/cg-review [file\|module\|diff]` | Reconstruct the implemented graph, diff it against the method's checklist, end with a VERDICT. |
| `/cg-map <language\|framework>` | Map the Protocol vocabulary onto a stack's idioms (Result vs exceptions, RAII vs defer). |

## A real-world walkthrough

Task: *add rate limiting to an Express API.* One design pass, end to end:

```
> /dt                                        # mode on — graph-first rules injected

> /cg-plan add per-user rate limiting to the API
    → agent sketches a DesignGraph first (SHAPES, GRAPH, E, boundaries),
      then implements code that matches it

> /cg-map nodejs                             # optional: before planning, when the
    → maps ⟳↯☠🔒 onto express idioms         #   stack's vocabulary is unclear
      (middleware = boundary, AbortError = ↯escape)

> git diff → review it with:
> /cg-review src/middleware/ratelimit.ts
    → extracts the graph the code ACTUALLY implements, diffs it against
      the planned one, findings grouped by § number, ends with VERDICT

> /dt off                                    # done — back to normal mode
```

The cycle:

```mermaid
flowchart LR
    A["/dt on"] --> B{"stack idioms<br/>clear?"}
    B -- no --> M["/cg-map nodejs"]
    B -- yes --> P
    M --> P["/cg-plan <task>"]
    P --> C[implement] --> R["/cg-review <file>"] --> O["/dt off"]
```

Skills (`graph-protocol`, `design-method`, `design-graph`) are loaded by the
agent on demand mid-turn — you never invoke them directly; the `/cg*`
commands and `/dt` mode tell the model when to reach for them.

## How `/dt` persists across restarts

`/dt` writes its on/off state to `.claude/design-thinking.local.md`
(`enabled: true|false`) in your project. A `SessionStart` hook reads that file
once per session and, if enabled, re-announces the mode — so it survives a
Claude Code restart without re-injecting the mode block on every single turn.

Add this to your project's `.gitignore` (it's per-user, per-project state,
not something to commit):

```gitignore
.claude/*.local.md
```
