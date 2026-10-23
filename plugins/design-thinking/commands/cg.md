---
description: Generate a call graph of a module or task (Design Thinking output format)
argument-hint: "<module | task>"
---
Extract (if target is existing code) or sketch (if target is a task) the call graph for: $ARGUMENTS

Apply the Design Thinking method: nodes are functions, edges are data flow.

## Trace of existing code: call graph block

When the target is existing code, the GRAPH section is this block. Plain
text only, no rendered diagrams.

````
graph: <short title>

Production:
```ts
EntryPoint
  → ComponentA
    → ComponentA.method
      → [condition] ComponentB
        → {queue_or_store}
```

Tests:
```ts
TestEntryPoint
  → ComponentATestLayer
    → ComponentB.layerMemory
```

src:
  EntryPoint → path/to/file:LINE
  ComponentA → path/to/component:LINE
````

- `ts` fence, two-space-indented `→` children; the root has no arrow.
- Real symbol names only. Production always; Tests only when the test graph
  differs. Never invent a test graph.
- Every unique node gets verified `path:line` evidence under `src:`. Find it
  with the language server, `rg`, or the code index; never guess.
- Planned nodes in a sketch are `[new]`, with no line number.
- A trivial single-fact question (a port, a version) gets a direct answer, no graph.

## Output format: quick reference

Emit ALL sections below, in this order, with these markers:

```
PROBLEM: <one line>

X → Graph → Effect<A, E, R>
│              │   │  │  │
│              │   │  │  └─ R: what each node needs      (§5)
│              │   │  └──── E: where the graph breaks    (§4)
│              │   └─────── A: what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem

SHAPES:  records · IDs · state variants · named errors
GRAPH:   call graph block above (trace) or ascii call graph (sketch), annotated:
         R: deps · E: err ⟳retry[×n] → ↯escape(alt) | ☠die · 🔒 unknown→trusted
CARDINALITY: node (1) one-shot · (N) many over time · (T) time-bounded
BOUNDARIES:  every untrusted→trusted crossing (parse, don't validate)
BEHAVIOR:    orthogonal layers (retry, cache, logging) that wrap without changing the graph
SCOPE:       resources: acquire@x → release@x (structural, not convention)
TEST LAYERS: the R tests provide; same GRAPH, zero code change
VERDICT:     code matches graph? happy path free of error handling? E fully enumerated?
```

## Rules

- The graph is the ground truth. For existing code, reconstruct the graph the
  code ACTUALLY implements, not what the author intended.
- Every node gets cardinality + `R:`. Every failure gets `⟳`, `↯`, or `☠`.
  Every trust crossing gets `🔒`.
- Adapt vocabulary to the target language/stack (exceptions vs Result types,
  RAII vs context managers, etc.), never the discipline.
- Nodes that violate the method (tangled happy path, unscoped resources,
  hidden dependencies) go under VERDICT, grouped by § number.

Full specs live in this plugin's `design-thinking` (code method), `design-graph`
(interface method), and `graph-protocol` (delegation to agents) skills; each
links the plugin's `references/output-format.md` (format + checklist).
