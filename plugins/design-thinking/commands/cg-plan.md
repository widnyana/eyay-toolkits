---
description: Design before code - full graph for a task, delegation plan when it needs many workers, then implement to match
argument-hint: "<task description>"
---
Task: $ARGUMENTS

Design it before writing any code. Three steps, in order.

## Step 1: the design graph

Code task: apply the Design Thinking pipeline (§1-§10) and emit every section
of the output format below. Interface task (screens, flows, components): use
the Design Graph skeleton from the `design-graph` skill instead (JOB, SURFACES, FLOW,
CARDINALITY, VOID, NEEDS, BOUNDARY, BEHAVIOR, ATTENTION, PROOF, VERDICT).

```
PROBLEM: <one line; if it doesn't fit, the problem is not understood, refine first>

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
GRAPH:   ascii call graph, annotated inline (planned nodes marked [new]):
         R: deps · E: err ⟳retry[×n] → ↯escape(alt) | ☠die · 🔒 unknown→trusted
CARDINALITY: node (1) one-shot · (N) many over time · (T) time-bounded
BOUNDARIES:  every untrusted→trusted crossing (parse, don't validate)
BEHAVIOR:    orthogonal layers (retry, cache, logging) that wrap without changing the graph
SCOPE:       resources: acquire@x → release@x (structural, not convention)
TEST LAYERS: the R tests provide; same GRAPH, zero code change
VERDICT:     the target structure the implementation must satisfy
```

Pipeline:

1. **§1 Shapes**: the domain nouns, named before any graph is drawn.
2. **§2 A**: happy path as a call graph, drawn first.
3. **§3 Cardinality**: `(1)`, `(N)`, `(T)` per node.
4. **§4 E**: every break point gets `⟳retry`, `↯escape(alt)`, or `☠die`.
5. **§5 R**: every node declares its requirements; provided at the composition root.
6. **§6 Boundary**: parse `unknown → trusted` at edges only; trust inside.
7. **§7 Behavior**: cross-cutting concerns wrap nodes orthogonally.
8. **§8 Scope**: acquire/release structurally bound (RAII / defer / context managers).
9. **§9 Test**: same graph runs with test R; if it can't, hidden deps exist.
10. **§10 Code**: happy path body = A only; failure join points = E. Divergent
    strategies (per-fork failure semantics) are the one exception; mark them.

## Step 2: one worker or many (Graph Protocol §3)

- **One worker** (small task, one node, done in this session): no execution
  graph. Go to step 3.
- **Many workers** (two or more independent parts, or any part a subagent or
  separate worker will do): emit the Graph Protocol blocks from
  the `graph-protocol` skill: the DELEGATED GRAPH (nodes, edges, waves), then one
  AGENT SUBGRAPH per node. Each node's SUBGRAPH field is its slice of the
  step 1 graph. Every subgraph carries WHY, INPUTS, OUTPUT, METHOD, VERIFY,
  and a RETURN block. Nodes that touch the same files never share a wave.

## Step 3: implement to match

- One worker: implement. Code must match the step 1 graph; if a snippet
  contradicts the graph, fix the graph or fix the code, never let them drift.
- Many workers: spawn each wave with its AGENT SUBGRAPHs, gate between waves,
  retry a failed node once, re-plan evolved nodes. After the last wave emit
  the IMPLEMENTED GRAPH and compare it with the DELEGATED GRAPH (OFF-SCRIPT,
  GAPS, VERDICT). Re-run VERIFY yourself; never trust a worker's own "pass".

Output contract:

- Graph first, delegation blocks second (only when many workers), then the
  implementation.
- Each layer scopes its own E before handing off; inner errors never leak.
- Adapt vocabulary to the project's language/stack, never the discipline.
- The VERDICT states the structural invariants the code must satisfy, so the
  graph can later be re-checked with `/cg-review`.

Full specs live in this plugin's `design-thinking` (code method), `design-graph`
(interface method), and `graph-protocol` (delegation to agents) skills; each
links the plugin's `references/output-format.md` (format + checklist).
