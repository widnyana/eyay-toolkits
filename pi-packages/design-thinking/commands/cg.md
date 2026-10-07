---
description: Generate a call graph of a module or task in Graph Protocol format
argument-hint: "<module | task>"
---
Extract (if target is existing code) or sketch (if target is a task) the call graph for: $@

Apply the Design Graph method — nodes are functions, edges are data flow.

## Graph Protocol — quick reference

Emit ALL sections below, in this order, with these markers:

```
PROBLEM: <one line>

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
VERDICT:     code matches graph? happy path free of error handling? E fully enumerated?
```

## Rules

- The graph is the ground truth. For existing code, reconstruct the graph the
  code ACTUALLY implements — not what the author intended.
- Every node gets cardinality + `R:`. Every failure gets `⟳`, `↯`, or `☠`.
  Every trust crossing gets `🔒`.
- Adapt vocabulary to the target language/stack (exceptions vs Result types,
  RAII vs context managers, etc.) — never the discipline.
- If you find nodes that violate the method (tangled happy path, unscoped
  resources, hidden dependencies), list them under VERDICT, grouped by § number.

If the full spec is needed, load the skills shipped in the `design-thinking`
pi package: `/skill:graph-protocol` (notation) and `/skill:design-method`
(the method).
