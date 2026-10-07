---
description: Design before code — produce a complete Design Graph for a task, then implement to match it
argument-hint: "<task description>"
---
Task: $@

Design it before writing any code. Apply the full Design Thinking pipeline and
produce a complete Design Graph in Graph Protocol format. Code suggestions must
match the graph — if a snippet contradicts the graph, fix the graph or fix the
code, never let them drift silently.

## Graph Protocol — quick reference

Emit ALL sections below, in this order, with these markers:

```
PROBLEM: <one line — if it doesn't fit, the problem is not understood; refine first>

X → DesignGraph<A, E, R>
│              │   │  │  │
│              │   │  │  └─ R: what each node needs      (§5)
│              │   │  └──── E: where the graph breaks    (§4)
│              │   └─────── A: what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem

SHAPES:  records · IDs · state variants · named errors
GRAPH:   ascii call graph, annotated inline:
         R: deps · E: err ⟳retry[×n] → ↯escape(alt) | ☠die · 🔒 unknown→trusted
CARDINALITY: node (1) one-shot · (N) many over time · (T) time-bounded
BOUNDARIES:  every untrusted→trusted crossing (parse, don't validate)
BEHAVIOR:    orthogonal layers (retry, cache, logging) that wrap without changing the graph
SCOPE:       resources: acquire@x → release@x (structural, not convention)
TEST LAYERS: the R tests provide — same GRAPH, zero code change
VERDICT:     the target structure the implementation must satisfy
```

## Pipeline to follow

1. **§1 Shapes** — the domain nouns, named before any graph is drawn.
2. **§2 A** — happy path as a call graph, drawn first.
3. **§3 Cardinality** — one-shot `(1)`, many `(N)`, time-bounded `(T)` per node.
4. **§4 E** — every break point gets one of: `⟳retry`, `↯escape(alt)`, `☠die`.
5. **§5 R** — every node declares its requirements; provided at the composition root.
6. **§6 Boundary** — parse `unknown → trusted` at edges only; trust inside.
7. **§7 Behavior** — cross-cutting concerns wrap nodes orthogonally.
8. **§8 Scope** — acquire/release structurally bound (RAII / defer / context managers).
9. **§9 Test** — same graph runs with test R; if it can't, hidden deps exist.
10. **§10 Structure** — happy path body = A only; failure handling at defined
    join points = E. Divergent strategies (per-fork failure semantics) are the
    one exception — mark them.

## Output contract

- Design Graph first (all Protocol sections), then the implementation.
- Each layer scopes its own E before handing off; inner errors never leak.
- Adapt vocabulary to the project's language/stack — never the discipline.
- The VERDICT section states the structural invariants the code must satisfy so
  the graph can later be re-checked in review (`/cg-review`).

Full specs load as skills in the `design-thinking` pi package:
`/skill:graph-protocol` (notation), `/skill:design-method` (the method),
`/skill:design-graph` (artifact).
