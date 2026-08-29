---
description: Review code against its call graph — reconstruct the implemented Design Graph and diff it
argument-hint: "[file | module | diff, default: current diff]"
allowed-tools: Bash(git diff:*), Bash(git status:*), Read
---
Review target: $ARGUMENTS

If no target was given above, review the current uncommitted diff instead:
!`git diff`

Reconstruct the Design Graph the code ACTUALLY implements — not the one the
author intended. Then diff it against the method's completeness checklist.
Every mismatch is a finding.

## Graph Protocol — quick reference

Emit ALL sections below, in this order, with these markers:

```
PROBLEM: <one line — what this code does, as implemented>

X → DesignGraph<A, E, R>
│              │   │  │  │
│              │   │  │  └─ R: what each node needs      (§5)
│              │   │  └──── E: where the graph breaks    (§4)
│              │   └─────── A: what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem

SHAPES:  records · IDs · state variants · named errors (as actually present)
GRAPH:   ascii call graph of the implemented code, annotated inline:
         R: deps · E: err ⟳retry[×n] → ↯escape(alt) | ☠die · 🔒 unknown→trusted
CARDINALITY: node (1) one-shot · (N) many over time · (T) time-bounded
BOUNDARIES:  every untrusted→trusted crossing (parse, don't validate)
BEHAVIOR:    orthogonal layers that wrap without changing the graph
SCOPE:       resources: acquire@x → release@x (structural, not convention)
TEST LAYERS: can this graph run with substituted R? if not — hidden deps
VERDICT:     <matches | mismatches listed by § number>
```

## Findings checklist (group findings by § number)

- **§1 Shapes** — unnamed errors (stringly-typed failures), bare-string IDs,
  missing state variants.
- **§2 A** — happy path unreadable; error handling woven through it (A/E tangled).
- **§3 Cardinality** — `(N)` implemented as `(1)`, unbounded collection treated
  as one-shot, missing cache/dedupe for `(T)`.
- **§4 E** — unmarked breaks, silent swallowing, `☠die` used for domain errors,
  retry on non-transient failures.
- **§5 R** — hidden dependencies, node constructs its own infrastructure,
  world-mocking required to test one node.
- **§6 Boundary** — validation scattered inside the graph instead of parsing at
  edges, trusted shapes built from untrusted data without conversion.
- **§7 Behavior** — retry/timeout/logging hard-coded into business logic
  instead of wrapping orthogonally.
- **§8 Scope** — resources released by convention or not at all; cleanup as TODO.
- **§9 Test** — graph can't run with substituted R.
- **§10 Structure** — per-layer E scoping violated (inner errors leak through);
  divergent strategies not marked.

## Output contract

- Implemented graph first (all Protocol sections), then findings, then VERDICT.
- VERDICT must be explicit: "code matches graph" or the mismatch list.
- If an intended graph exists (e.g. from a prior `/cg-plan`), diff against it;
  otherwise review against the checklist alone.
- Severity: mark findings that will cause runtime failures vs structural debt.

Full specs live in this plugin's `graph-protocol` skill (notation),
`design-method` skill (the method), and `design-graph` skill (artifact).
