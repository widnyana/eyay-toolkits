---
description: Map the Graph Protocol vocabulary onto a language/framework's concrete idioms
argument-hint: "<language | framework>"
---
Map the Design Graph method onto: $@

Produce a vocabulary mapping so the method's three channels (A, E, R) and its
markers have concrete, idiomatic counterparts in the target stack. Output a
mapping table followed by a small worked mini-graph in Graph Protocol format.

## Mapping table (required rows)

| Protocol concept | Question to answer for the target stack |
|---|---|
| **A** — happy path | Where does the straight-line happy path live? (main fn, do-block, generator pipeline, SQL CTE chain…) |
| **E** — failure carrying | How are failures values vs control flow? (Result/Either, checked exceptions, error returns, panics+recover, throw at layer joins…) |
| **⟳ retry** | Idiomatic retry: library, decorator, middleware, policy object? |
| **↯ escape** | Idiomatic fallback: default value, cache read, alternative path? |
| **☠ die** | What counts as a defect? (assert, panic, raise RuntimeError, process abort…) |
| **R** — dependencies | How are deps declared and provided? (constructor injection, traits, typeclasses, DI container, closure capture, context.Context…) |
| **🔒 boundary parse** | Where do unknown→trusted conversions live? (schema lib, DTO layer, parsing constructors, guards…) |
| **(1) (N) (T)** | One-shot vs stream vs time-bounded: iterators, channels, observables, TTL caches… |
| **⛈ behavior layers** | Middleware/decorator/aspect story of the stack |
| **Scope** | RAII, defer, context managers, try-with-resources, drop… |
| **A/E structural split** | How the stack separates happy path from failure join points (pipe, middleware stack, Result chain, try/catch at edges) |
| **E layer scoping** | How each layer translates inner errors into its own error type before handing off |

## Rules

- Be concrete: name actual libraries, patterns, and syntax idioms of the stack.
- If the stack lacks a native counterpart for a concept, say so and name the
  closest convention (and its cost).
- After the table, render a mini Design Graph (PROBLEM → header tree → GRAPH →
  VERDICT only) for a small example task in this stack, using the mapped
  vocabulary — proving the mapping works end to end.
- This mapping is a companion artifact: once produced, refer to it in later
  `/cg-plan` and `/cg-review` runs in the same stack.

Full specs load as skills in the `design-thinking` pi package:
`/skill:graph-protocol` (notation), `/skill:design-method` (the method),
`/skill:design-graph` (artifact).
