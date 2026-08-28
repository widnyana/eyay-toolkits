---
name: design-graph
description: >
  Design Graph — the artifact: annotated call graph of a concrete problem;
  nodes = functions, edges = data flow; every node annotated with A,
  cardinality, E, R. Use when drawing a graph before writing code or
  reconstructing and diffing one against existing code. Includes the
  completeness checklist.
---

# Design Graph — The Artifact

A **Design Graph** is the annotated call graph of a concrete problem. It is
what you produce when you apply [Design Thinking](/skill:design-method) to
something, and it is written in [Graph Protocol](/skill:graph-protocol) notation.

Nodes are functions. Edges are data flow. The annotations answer, for every
node: what flows through it (A), how many times it runs (cardinality), where
and how it can fail (E), and what it needs to exist (R) — plus the global
concerns: trust boundaries, behavior layers, resource scope, and test layers.

A Design Graph is not documentation written after the fact. It is drawn
**before** implementation (planning), **reconstructed** from implementation
(review), and **compared** against implementation (verdict). The graph is the
contract; the code is one instantiation of it.

---

## What a complete Design Graph contains

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

SHAPES:  …        every noun the graph needs
GRAPH:  …        ascii call graph with inline R:/E:/🔒/(n) annotations
CARDINALITY: …   every node marked (1) (N) or (T)
BOUNDARIES: …    every unknown → trusted crossing
BEHAVIOR: …      every orthogonal layer and what it wraps
SCOPE: …         every resource with acquire@x → release@x
TEST LAYERS: …   the R tests provide — same GRAPH, zero code change
VERDICT: …       code matches graph? A and E structurally separated?
```

## Completeness checklist

A Design Graph is complete when all of the following hold:

- [ ] Every node has a cardinality marker — `(1)`, `(N)`, or `(T)`.
- [ ] Every node lists its `R:` — even if `R: none` (that is a feature: the
      node is runnable standalone).
- [ ] Every edge crossing a trust boundary is marked `🔒 unknown → trusted`.
- [ ] Every failure mode has a strategy — `⟳retry`, `↯escape(alt)`, or
      `☠die`. No unmarked breaks, no silent swallowing.
- [ ] Every layer scopes its E before handing off (inner errors translated,
      never leaked).
- [ ] Every resource has an acquire point and a structural release point.
- [ ] BEHAVIOR lists only layers that can be removed without touching the
      happy path.
- [ ] TEST LAYERS shows a full R substitution — if it can't, the graph has
      hidden dependencies.
- [ ] VERDICT explicitly answers whether code and graph match, and names the
      mismatches.

## The three uses

### 1. Plan (`/cg-plan`)
Draw the graph first. Code is written only after the VERDICT question — "does
my code match this?" — has a target to be checked against. If a code
suggestion contradicts the graph, fix the graph or fix the code; never let
them drift silently.

### 2. Extract (`/cg`)
Given existing code, reconstruct the graph the code *actually* implements —
not the one the author intended. The reconstructed graph is the ground truth
for review and refactoring.

### 3. Review (`/cg-review`)
Render the implemented graph, then diff it against the intended graph (or
against the method's completeness checklist when no intended graph exists).
Every mismatch is a finding, grouped by § number. The review ends with a
VERDICT line.

---

## Worked example

See the end of the [Graph Protocol](/skill:graph-protocol) skill for a complete, non-TS worked
example (a resumable URL-sync CLI in Python) with all sections filled.
