---
name: design-method
description: >
  Design Thinking — the §1–§10 problem-first pipeline: shapes → graph(A) →
  cardinality → break points (E: ⟳ ↯ ☠) → requirements (R) → boundaries →
  behavior layers → scope → test layers → verdict. Stack-agnostic. Use when
  planning, designing, or refactoring any feature or system.
---

# Design Thinking — The Method

A stack-agnostic design methodology. Read the problem. Draw the data flow as a
call graph (the **Design Graph**). Write code that IS the graph. If the code
doesn't match the graph, something is wrong.

The method is language-neutral. Where it says "Effect", "gen", or "pipe" in the
Effect-TS appendix (`effect-ts.md`), substitute your stack's equivalent: Result
types, exceptions at layer joins, middleware, RAII, constructor injection —
whatever your language provides. The discipline never changes, only the vocabulary.
**Hard gate — applies in every harness (pi, omp, Claude Code, any agent):**
When the user asks for a feature, change, fix, or refactor — or when any turn
will end in proposed code or file edits — you MUST render the Design Graph
(Graph Protocol) and any clarifying questions BEFORE touching any file, and
implement only after the user approves the design. Reading and exploring code
first is fine; the FIRST edit is not allowed before the graph. This rule is
not optional and not stack-dependent.

Render every result in Graph Protocol format (see the `graph-protocol` skill).

```
X → DesignGraph<A, E, R>
│              │   │  │  │
│              │   │  │  └─ what each node needs     (§5)
│              │   │  └──── where the graph breaks   (§4)
│              │   └─────── what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem: what you're trying to build

§1  Shapes       the nouns: records, IDs, variants, errors
§2  A            happy path as call graph
§3  Cardinality  one-shot (1), many (N), or time-bounded (T)
§4  E            break points: retry, escape, die
§5  R            dependencies: compile-time or wiring-time proof
§6  Boundary     parse: unknown → trusted at edges
§7  Behavior     orthogonal layers wrap without changing the graph
§8  Scope        acquire/release tied to lifecycle
§9  Test         swap R, same graph shape
§10 Structure    happy path = A, failure handling = E, never tangled
```

## 1. Name the shapes

What are the things? Before drawing a graph, define the domain language.

- **Records** — entities that flow through nodes. A User, a Product, an Order.
- **IDs** — identity of things. Branded, constrained, never a bare string.
- **Variants** — internal state transitions. A step is Continue or Finished.
  A status is Pending, Active, or Cancelled.
- **Errors** — named failure modes. Not strings. Structured, carrying context.

These are the nouns. The graph is the verbs. You cannot draw the graph until
you know what flows through it.

→ *Protocol section: SHAPES.*

## 2. Think A first

Map the happy path as a call graph before writing any code.

```
F1(A) -> F2(A) -> F3(A)
```

What is the success data flow? What goes in, what comes out, what transforms
happen in between? This graph IS your program structure. Draw it first. The
code follows.

→ *Protocol section: GRAPH (edges) + header tree (A).*

## 3. One or many?

Is each node one-shot or a flow?

- **One value** — the node runs, produces A, done. `(1)`
- **Many values over time** — the node emits A repeatedly: events,
  subscriptions, paginated pulls, batches. `(N)`
- **Time-bounded** — the result is valid for a window. Cache it. Deduplicate
  concurrent lookups. `(T)`

Same three channels (A, E, R) in all cases. Different cardinality. Mark it on
the graph so the code matches.

→ *Protocol section: CARDINALITY.*

## 4. Think E second

Mark where the graph can break. Each break point is one of three things:

- **Retry** `⟳` — transient failure, try again. Network timeout, rate limit,
  connection reset.
- **Escape Hatch** `↯` — recoverable, return an alternative. Fallback value,
  cached result, default, skip-and-continue.
- **Die** `☠` — defect, invariant violation, programmer bug. NOT a domain
  error. Something is fundamentally wrong.

Failures are first-class values in the E channel until you truly cannot handle
them. They flow through the graph like data — whether your language expresses
that as Result types, checked exceptions, error returns, or a strict rule that
exceptions only cross at layer joins. You decide at each node: retry, escape,
or propagate. Only `die` when the program's assumptions are violated.

→ *Protocol section: GRAPH (E annotations) + VERDICT.*

## 5. Think R third

Mark what each node in the graph needs to exist. "We cannot do X if we don't
have Y."

R is proof that dependencies are satisfied — at compile time (injected via
constructors, generics, typeclasses, traits) or at wiring time (composition
root, DI container, context object). Every node declares what it requires: a
database connection, a config value, an HTTP client. R shrinks as you provide
layers. When R is empty, the program can run. If R is not empty, the compiler
or the wiring tells you exactly what's missing.

→ *Protocol section: GRAPH (R annotations) + TEST LAYERS.*

## 6. Trust at boundary

Where does untrusted data enter the graph? HTTP requests, file reads,
environment variables, user input, third-party API responses.

Convert `unknown → trusted` at the edges — a schema, a parsing constructor, a
validating factory, a DTO boundary. One definition = type + validator +
transformer. Define it once, use it everywhere.

Trust nothing at the boundary. Trust everything inside. The boundary is the
only place you parse. After that, the types guarantee shape.

→ *Protocol section: BOUNDARIES.*

## 7. Layer behavior

What cross-cutting concerns wrap nodes? Retry policies, timeouts, logging,
tracing, caching.

These wrap WITHOUT changing the core graph — middleware, decorators,
higher-order functions, aspects. The happy path stays clean: you can read it
without wading through retry logic and timeout configuration. Behavior is
composed orthogonally. The graph says WHAT happens. The layers say HOW it
behaves under pressure.

→ *Protocol section: BEHAVIOR.*

## 8. Scope resources

What nodes acquire resources? Database connections, file handles, WebSocket
connections, child processes, locks.

Acquire/release must be structurally bound: RAII, `defer`, context managers,
`try/finally` at the owning node — even on error, even on interrupt. Cleanup
is structural, not a TODO comment you hope someone remembers.

→ *Protocol section: SCOPE.*

## 9. Swap R to prove it

The call graph doesn't change between production and tests. Only R changes.

Same graph shape. Same A flowing through. Same E possible. Different layer
behind R. If the graph can't run with a test R, the design has hidden
dependencies. If you have to mock the world to test one node, the node is
doing too much.

This is the payoff of separating A, E, and R — you prove the graph correct by
swapping what's behind R.

→ *Protocol section: TEST LAYERS.*

## 10. Separate A from E structurally

The separation of A (§2) and E (§4) maps directly onto code structure, in any
language:

- **The happy path body** — one readable place. Every call is an A flowing
  through the graph. No error handling inside. (In Effect-TS: the `Effect.gen`
  body. Elsewhere: the main function, the do-notation block, the straight-line
  pipeline of calls.)
- **The failure join points** — the complete E enumeration. Before writing
  them, read the actual failure modes of every node on the happy path. The
  join points catch, retry, or translate every E the happy path can produce.
  (In Effect-TS: `.pipe()` after gen. Elsewhere: the middleware stack, the
  Result chain, the try/catch at the layer boundary.)

This is not a stylistic preference. If error handling lives inside the happy
path body, the A path and E path are tangled — you cannot read the happy path
without wading through catches and retries. The happy path body IS the call
graph from §2. The join points ARE the error annotations from §4.

### E scoping at graph layers

Each layer scopes its own E before passing to the next layer. A service catches
storage errors and produces a domain error. Auth catches domain errors and
produces an access error. The handler catches access errors and produces the
declared interface error. Each layer's handling is a complete enumeration of
what IT received — not what originated three layers down. Consumers never see
implementation errors from deeper layers. *(See protocol.md for the diagram.)*

### Divergent strategies

When two nodes in the same happy path need different failure handling — one
should fail hard, the other should fall back gracefully — that is a
**divergent strategy**. Handle each node's E inline within the happy path at
the fork, because the outer join point cannot distinguish which node produced
which error. This is the ONE exception to "no error handling in the happy
path." It exists because the graph has a fork: two branches with different
failure semantics sharing a node. Mark it clearly — it should be rare.

---

## The Pipeline

```
PROBLEM
  -> "What are the shapes?"                       -> define the domain language
  -> "What is the happy path?"                    -> draw the call graph (A)
  -> "Is each node one-shot or a flow?"           -> mark cardinality
  -> "Where can it break?"                        -> annotate errors on the graph (E)
  -> "What does each node need?"                  -> annotate requirements on the graph (R)
  -> "Where does untrusted data enter?"           -> parse at graph boundaries
  -> "What wraps nodes without changing them?"    -> layer behavior orthogonally
  -> "What resources need cleanup?"               -> scope lifecycle
  -> "Can I swap R and the graph still works?"    -> verify with test layers
  -> "Does my code separate A from E structurally?" -> happy path = A, joins = E
  -> CODE                                         -> the code IS the graph
```

**If the code doesn't match the call graph, the implementation is wrong.**

---

*The original Effect-TS instantiation of this method ships verbatim in the
plugin at `references/effect-ts.md` — for attribution and Effect-TS users
only. Everything above is stack-agnostic.*
