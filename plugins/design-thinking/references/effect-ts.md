> **Source**: Design Thinking by [r17x](https://github.com/r17x) —
> https://gist.github.com/r17x/90eb2f7be93932b5693753aedb09c01a
> Bundled verbatim as the original Effect-TS instantiation of the method.
> The generalized, stack-agnostic version lives in [method.md](method.md);
> the notation spec lives in [protocol.md](protocol.md).

# Design Thinking

```
X → Graph → Effect<A, E, R>
│              │   │  │  │
│              │   │  │  └─ what each node needs     (§5)
│              │   │  └──── where the graph breaks   (§4)
│              │   └─────── what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem: what you’re trying to build

§1  Shapes       the nouns: records, IDs, variants, errors
§2  A            happy path as call graph
§3  Cardinality  one-shot (Effect) or many (Stream)
§4  E            break points: retry, escape, die
§5  R            dependencies: compile-time proof
§6  Boundary     Schema: unknown → trusted at edges
§7  Behavior     .pipe() wraps without changing the graph
§8  Scope        acquire/release tied to lifecycle
§9  Test         swap R, same graph shape
§10 Code         gen body = A, .pipe() = E
```

Read the problem. Draw the data flow as a call graph. Write code that IS the graph. If the code doesn't match the graph, something is wrong.

## 1. Name the shapes

What are the things? Before drawing a graph, define the domain language.

- **Records** -- entities that flow through nodes. A User, a Product, an Order.
- **IDs** -- identity of things. Branded, constrained, never a bare string.
- **Variants** -- internal state transitions. A step is Continue or Finished. A status is Pending, Active, or Cancelled.
- **Errors** -- named failure modes. Not strings. Tagged, structured, carrying context.

These are the nouns. The graph is the verbs. You cannot draw the graph until you know what flows through it.

## 2. Think A first

Map the happy path as a call graph before writing any code.

```
F1(A) -> F2(A) -> F3(A)
```

What is the success data flow? What goes in, what comes out, what transforms happen in between? This graph IS your program structure. Draw it first. The code follows.

## 3. One or many?

Is each node one-shot or a flow?

- **One value** -- the node runs, produces A, done. This is Effect.
- **Many values over time** -- the node emits A repeatedly. Events, subscriptions, paginated pulls. This is Stream.
- **Time-bounded** -- the result is valid for a window. Cache it. Deduplicate concurrent lookups.

Same three channels (A, E, R) in all cases. Different cardinality. Mark it on the graph so the code matches.

## 4. Think E second

Mark where the graph can break. Each break point is one of three things:

- **Retry** -- transient failure, try again. Network timeout, rate limit, connection reset.
- **Escape Hatch** -- recoverable, return an alternative. Fallback value, cached result, default.
- **Die** -- defect, invariant violation, programmer bug. NOT a domain error. Something is fundamentally wrong.

Errors are VALUES in the E channel until you truly cannot handle them. They flow through the graph like data. You decide at each node: retry, escape, or let it propagate. Only `die` when the program's assumptions are violated.

## 5. Think R third

Mark what each node in the graph needs to exist. "We cannot do X if we don't have Y."

R is compile-time proof that dependencies are satisfied. Every node declares what it requires -- a database connection, a config value, an HTTP client. R shrinks as you provide layers. When R is empty (`never`), the program can run. If R is not empty, the compiler tells you exactly what's missing.

## 6. Trust at boundary

Where does untrusted data enter the graph? HTTP requests, file reads, environment variables, user input, third-party API responses.

Schema converts `unknown -> trusted` at the edges. One definition = type + validator + transformer. Define it once, use it everywhere.

Trust nothing at the boundary. Trust everything inside. The boundary is the only place you parse. After that, the types guarantee shape.

## 7. Layer behavior

What cross-cutting concerns wrap nodes? Retry policies, timeouts, logging, tracing, caching.

These wrap via `.pipe()` WITHOUT changing the core graph. The happy path stays clean -- you can read it without wading through retry logic and timeout configuration. Behavior is composed orthogonally. The graph says WHAT happens. The layers say HOW it behaves under pressure.

## 8. Scope resources

What nodes acquire resources? Database connections, file handles, WebSocket connections, child processes.

Acquire/release is a type guarantee. If a node opens a connection, scope ensures it closes -- even on error, even on interrupt. Cleanup is structural, not a TODO comment you hope someone remembers.

## 9. Swap R to prove it

The call graph doesn't change between production and tests. Only R changes.

Same graph shape. Same A flowing through. Same E possible. Different layer behind R. If the graph can't run with a test R, the design has hidden dependencies. If you have to mock the world to test one node, the node is doing too much.

This is the payoff of separating A, E, and R -- you prove the graph correct by swapping what's behind R.

## 10. gen is A, pipe is E

The separation of A (step 2) and E (step 4) maps directly to Effect code structure:

- **`Effect.gen` body** -- the happy path. Every `yield*` is an A flowing through the graph. No error handling inside.
- **`.pipe()` after gen** -- the complete E enumeration. Before writing the pipe, read the actual E type of every yielded effect. The pipe catches, retries, or transforms every E that the gen body can produce.

This is not a stylistic preference. If error handling lives inside the gen body, the A path and E path are tangled -- you cannot read the happy path without wading through catches and retries. The gen body IS the call graph from step 2. The pipe IS the error annotation from step 4.

### E scoping at graph layers

Each layer in the call graph scopes its own E before passing to the next layer:

```
Services  →  Auth  →  Handlers
E=SqlError    E=DatabaseError    E=AuthError    E=RPC errors
  ↓ scope       ↓ scope            ↓ scope
DatabaseError  AuthError          RPC errors
```

A service catches SqlError and produces DatabaseError. Auth catches DatabaseError and produces AuthError. The handler catches AuthError and produces the RPC-declared error. Each layer's pipe is a complete enumeration of what IT received -- not what originated three layers down. Consumers never see implementation errors from deeper layers.

### Divergent strategies

When two effects in the same gen body need different E handling -- one should fail hard, the other should fall back gracefully -- that is a **divergent strategy**. Handle each effect's E inline within the gen body, because the outer pipe cannot distinguish which yield produced which error.

This is the ONE exception to "no error handling in gen." It exists because the graph has a fork: two branches with different failure semantics sharing a node. Mark it clearly -- it should be rare.

---

## The Pipeline

```
PROBLEM
  -> "What are the shapes?"                       -> define the domain language
  -> "What is the happy path?"                    -> draw the call graph (A)
  -> "Is each node one-shot or a flow?"           -> mark cardinality
  -> "Where can it break?"                        -> annotate errors on the graph (E)
  -> "What does each node need?"                  -> annotate requirements on the graph (R)
  -> "Where does untrusted data enter?"           -> Schema at graph boundaries
  -> "What wraps nodes without changing them?"    -> pipe behavior orthogonally
  -> "What resources need cleanup?"               -> scope lifecycle
  -> "Can I swap R and the graph still works?"    -> verify with test layers
  -> "Does my code separate A from E structurally?" -> gen body = A, pipe = E
  -> CODE                                         -> the code IS the graph
```

**If the code doesn't match the call graph, the implementation is wrong.**
