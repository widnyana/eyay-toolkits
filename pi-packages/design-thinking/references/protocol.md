# Graph Protocol

The notation spec for **Design Graphs**. A Design Graph is the annotated call graph
of a concrete problem: nodes are functions, edges are data flow, and every node
carries annotations for data (A), cardinality, failure (E), and requirements (R).

The Protocol is stack-agnostic. A graph written for Go, Rust, Python, TypeScript,
SQL, or a spreadsheet renders identically. Only the vocabulary inside the
annotations changes (e.g. what "retry" means in your language).

Every tool in this package (`/cg`, `/cg-plan`, `/cg-review`, `/cg-map`, and the
`/dt` active mode) MUST emit output in the format below.

---

## Canonical output skeleton

Sections appear in this fixed order. Omit a section only when it is genuinely
empty for the problem at hand (say so: `SCOPE: none`), never to skip thinking.

```
PROBLEM: <one-line statement of what you're building or examining>

X → DesignGraph<A, E, R>
│              │   │  │  │
│              │   │  │  └─ R: what each node needs      (§5)
│              │   │  └──── E: where the graph breaks    (§4)
│              │   └─────── A: what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem

SHAPES:  <the nouns: records, IDs, variants, errors>

GRAPH:
  <ascii call graph, annotated inline>

CARDINALITY: <node (1|N|T) list>
BOUNDARIES:  <every edge crossing untrusted → trusted>
BEHAVIOR:    <cross-cutting layers that wrap nodes>
SCOPE:       <resources: acquire@… → release@…>
TEST LAYERS: <the R that tests provide — same GRAPH, zero code change>
VERDICT:     <code matches graph? what is missing/tangled?>
```

---

## The header tree

The header names the problem and anchors the three channels. `X` is your problem;
everything after it is the graph you build.

```
X → DesignGraph<A, E, R>
│              │   │  │  │
│              │   │  │  └─ R: what each node needs      (§5)
│              │   │  └──── E: where the graph breaks    (§4)
│              │   └─────── A: what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem: what you're trying to build
```

---

## Section rules

### PROBLEM

One line. The thing you're building or the question you're answering. If you
cannot write it in one line, the problem is not understood — stop and refine.

### SHAPES

The domain nouns. Name them before drawing anything:

- **Records** — entities that flow through nodes (User, Order, Config).
- **IDs** — identity, never a bare primitive (UserId, Email).
- **Variants** — internal state transitions (pending|active|cancelled).
- **Errors** — named failure modes, structured, carrying context (not strings).

Format: comma-separated list. These are the nouns; the graph is the verbs.

### GRAPH

ASCII call graph. Nodes are functions/steps; edges are data flow. Annotate
**inline**, using the branch conventions from the header tree:

```
parse → Handler → Service → Repo
│                      │        │
│                      │        └─ R: DbConn · (N)
│                      └─ E: timeout ⟳retry×3 → ↯escape(cached)
└─ 🔒 HTTP body → trusted
```

Inline annotation grammar:

| Annotation | Meaning | Example |
|---|---|---|
| `R: a, b` | what the node requires (§5) | `R: DbConn, Config` |
| `E: <err> ⟳retry[×n] → ↯escape(alt)` | failure handling (§4) | `E: NetErr ⟳retry×3 → ↯escape(fallback)` |
| `E: <err> ☠die` | defect, not domain error (§4) | `E: NullConfig ☠die` |
| `🔒 x → y` | untrusted → trusted boundary (§6) | `🔒 JSON → Settings` |
| `(1) (N) (T)` | cardinality (§3) | `(N)` = many over time |
| `⛈ name` | behavior layer wrapping the node (§7) | `⛈logging wraps Service` |
| `@scope` | resource bound to a scope (§8) | `DbConn @main` |

### CARDINALITY

One line listing each node's arity:

- `(1)` — one-shot: runs once, produces one value.
- `(N)` — many: emits values over time (stream, iterator, subscription, pages).
- `(T)` — time-bounded: result valid for a window; cache it, dedupe concurrent lookups.

Same three channels (A, E, R) in all cases. Different cardinality. The code must
match: don't implement a `(N)` node as a one-shot.

### BOUNDARIES

Every place untrusted data enters the graph: HTTP requests, file reads, env
vars, user input, third-party responses. The rule: **parse, don't validate** —
convert `unknown → trusted` once, at the edge, then trust the types everywhere
inside. One definition per shape = type + validator + transformer, reused
everywhere.

### BEHAVIOR

Cross-cutting concerns that wrap nodes WITHOUT changing the core graph:
retry policies, timeouts, logging, tracing, caching. Composed orthogonally
(middleware, decorators, higher-order wrappers, aspects). The graph says WHAT
happens; the layers say HOW it behaves under pressure. If removing logging
forces you to edit business logic, behavior is not orthogonal.

### SCOPE

Resources that must be released: connections, file handles, sockets, child
processes. Acquire/release must be structurally bound (RAII, `defer`, context
managers, `try/finally`) — never convention or a TODO. Notation:

```
SCOPE: DbConn acquire@main → release@main · WS acquire@Handler → release@Handler
```

### TEST LAYERS

The R that tests provide. The call graph does not change between production and
tests — only R changes. Same graph, same A, same E, different layers behind R.
If the graph can't run with a test R, the design has hidden dependencies. If
you must mock the world to test one node, the node does too much.

### VERDICT

The structural check. Answer explicitly:

- Is the happy path (A) readable on its own, free of failure handling?
- Is every E the graph can produce handled at a defined join point?
- Do per-layer E scopes translate errors (inner errors never leak through)?
- Does the code match the graph? **If the code doesn't match the call graph,
  the implementation is wrong.**

---

## E scoping at graph layers

Each layer scopes its own E before passing to the next:

```
Services  →  Auth  →  Handlers
E=SqlErr      E=DbErr      E=AuthErr      E=RPC errs
  ↓ scope       ↓ scope      ↓ scope
DbErr          AuthErr      RPC errs
```

A service catches `SqlErr` and produces `DbErr`. Auth catches `DbErr` and
produces `AuthErr`. The handler catches `AuthErr` and produces the declared
error. Each layer's handling enumerates what IT receives — never what originated
three layers down. Consumers never see implementation errors from deeper layers.

## Divergent strategies (the one exception)

When two nodes in the same happy path need different failure semantics — one
must fail hard, another must fall back gracefully — handle that node's E
inline at the fork, because the outer layer cannot distinguish which node
produced which error. Mark it clearly; it should be rare.

---

## Worked example (non-TS: Python CLI)

```
PROBLEM: sync a list of URLs to local files, resumable, with a status line

X → DesignGraph<A, E, R>
│              │   │  │  │
│              │   │  │  └─ R: Http, Clock, Logger      (§5)
│              │   │  └──── E: NetErr, DiskErr          (§4)
│              │   └─────── A: (url, bytes), Status     (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem

SHAPES:  Url, Target(path), Downloaded(url, bytes), Status(pending|done|failed), NetErr, DiskErr

GRAPH:
  load_state → plan → fetch … download → write → report
  │                │              │                    │
  │                │              ├─ E: NetErr ⟳retry×3(-backoff) → ↯escape(skip, mark failed)
  │                │              └─ 🔒 raw bytes → Downloaded (size, content-type checked)
  │                └─ R: StateFile · (1)
  └─ 🔒 state file → trusted (schema-validated; corrupt → ↯escape(empty, warn))

CARDINALITY: load_state (1) · plan (1) · fetch (N) · download (1) · write (1) · report (T)
BOUNDARIES:  load_state 🔒 file → State · fetch 🔒 wire → Downloaded
BEHAVIOR:    ⛈retry wraps fetch · ⛈rate-limit wraps fetch · ⛈progress wraps write
SCOPE:       Http acquire@main → release@main · StateFile @main (context manager)
TEST LAYERS: R = {Http: FakeHttp, Clock: FrozenClock, Logger: Silent} — same GRAPH, no stubs in nodes
VERDICT:     happy path reads as the pipeline above; all NetErr handling lives at the
             write/report join, not inside download; state corruption escapes at the edge.
             Matches graph → implementation valid.
```

Note the stack vocabulary: `context manager` for scope, exceptions caught at
layer joins for E, plain functions for nodes. Protocol unchanged.
