> **Source**: Design Graph by [r17x](https://github.com/r17x), from
> https://gist.github.com/r17x/90eb2f7be93932b5693753aedb09c01a (`OPT_DESIGN_GRAPH.md`).
> Method text bundled as-is. The output skeleton at the end is added by this package.

# Design Graph

The same method, turned on the interface. A screen is not a picture — it is a node with three channels, and the layout you draw is the graph the user walks.

Design Thinking answers what flows through the program. Design Graph answers what the person in front of it can be looking at. Same three-channel discipline: one channel for the content, one for every way the content can be absent, one for what the surface needs before it may exist.

```
Job → Flow → Surface<C, V, N>
│      │      │  │  │
│      │      │  │  └─ what the surface needs to exist   (§5)
│      │      │  └──── every way the content is absent   (§4)
│      │      └─────── what the person reads and does    (§2)
│      │
│      └─ nodes = surfaces, edges = the moves between them
│
└─ the job: what the person came here to get done

§1  Surfaces     the nouns: screens, panes, rows, fields, controls
§2  C            happy path as flow graph
§3  Cardinality  one record (Detail) or many (List / live)
§4  V            void states: empty, loading, partial, error, denied
§5  N            needs: data, permission, prior step, viewport
§6  Boundary     validate at the field, not at submit
§7  Behavior     motion and feedback wrap a surface, never reshape it
§8  Scope        attention is acquired and must be released
§9  Proof        swap N, same flow shape
§10 Craft        markup = C, state styles = V
```

Read the job. Draw the moves as a flow graph. Build an interface that IS the graph. If a surface can render a state the graph cannot name, the interface is lying.

## 1. Name the surfaces

What are the things a person can look at? Before opening a layout tool, define the interface language.

- **Surfaces** -- the addressable places. A rail, a list, a detail pane, a drawer. Each one has a name and an owner.
- **Units** -- the repeated shape inside a surface. A row, a field, a metric. Named once, reused everywhere.
- **States** -- what a unit can be. Rest, hover, selected, disabled, stale. Enumerated, not improvised at build time.
- **Moves** -- what the person can do to get somewhere else. Open, select, dismiss, commit, undo.

These are the nouns. The moves are the verbs. A design system that names colours but not surfaces has no vocabulary — only a palette.

## 2. Think C first

Map the successful job as a flow graph before drawing a single frame. Nodes are surfaces, edges are the moves between them.

```
Rail(scope) -> List(C) -> Detail(C) -> Commit
```

This graph is the information architecture. Every screen that does not appear on it is a screen nobody asked for. If two nodes need the same surface, that surface is a component; if a node has one edge in and one edge out, it may not need to be a screen at all.

## 3. One or many?

Decide the cardinality of each node before its layout. Getting this wrong is the most expensive mistake in the graph, because it changes the shape of the surface, not its styling.

- **One record** -- a detail surface. Reading measure, full metadata, one primary action.
- **Many records** -- a list surface. Scannable, uniform rows, selection as a wash. Must survive 0, 1, and 10,000.
- **Live** -- values that change while being read. Show the timestamp, never move the row under the cursor.

Do not let a list masquerade as a card, and never let a live value pretend to be static. A surface designed for the average case has no design for the real one.

## 4. Think V second

V is the void channel: every way the content can fail to be there. Each node enumerates its own, and each one is a designed surface, not a fallback.

- **Empty** -- nothing yet, and that is fine. One grey sentence saying what will appear here.
- **Loading** -- the shape is known, the values are not. A flat skeleton in the layout the content will occupy.
- **Partial** -- some of it arrived. Show what you have and mark what is missing — never block the whole surface for one field.
- **Error** -- it broke, and the person can act. Say what failed, in their words, next to the thing that failed.
- **Denied** -- they may not see it. Prefer never routing them here over explaining the refusal.

A surface with one designed state and four undesigned ones is 20% designed. The void states are where the interface earns trust, because they are the states the person meets on their worst day.

## 5. Think N third

Mark what each surface needs before it is allowed to exist. "We cannot show X if we do not have Y."

N is the interface's version of compile-time proof. A surface declares its needs — a signed-in user, a selected record, a permission, a minimum viewport, a completed prior step — and the graph must satisfy them on the edge that reaches it.

- **Data** -- a record must be selected. No selection is a different node, not an empty pane.
- **Permission** -- if they cannot act, do not draw the affordance. A disabled button is a last resort.
- **Prior step** -- step 3 requires step 2. Unreachable is better than reachable and broken.
- **Viewport** -- three panes need width. Below it, the graph re-routes — the detail becomes a drawer, not a squeeze.

If a screen can be reached without its needs met, the flow graph has a hole. That hole is a bug in the design, not a case for the engineer to handle.

## 6. Trust at boundary

Where does the person's own input enter the graph? Fields, uploads, pastes, drags, URLs they typed themselves.

Validate at the field, not at submit. The boundary of the interface is the control they are touching — that is where unknown becomes trusted, and where the message belongs. One definition of a field gives the label, the constraint and the error sentence together.

Trust nothing at the boundary. Trust everything past it. A form that only fails on submit has moved its boundary to the wrong place, and made the person pay for the move.

## 7. Layer behavior

What wraps a surface without changing what it says? Motion, focus, feedback, density, keyboard affordance, reduced-motion.

These are layers around a node, never edits to it. A wash on hover, a reveal on entry, a ring on focus — the content graph is identical with them and without them. If removing the animation changes what the person can learn from the screen, the animation was carrying content and the layout was underbuilt.

The graph says WHAT the surface is. The layers say HOW it responds to being used.

## 8. Scope attention

Which surfaces acquire the person's attention? Modals, drawers, menus, toasts, anything that takes the viewport or the focus ring.

Attention is a resource with acquire and release. Whatever takes focus returns it to where it came from — on confirm, on cancel, on escape, on interrupt. Whatever covers the graph must name the single move that uncovers it.

An overlay with no defined release is a leak. The person is left holding a surface the graph has forgotten about.

## 9. Swap N to prove it

The flow graph does not change between the demo and the first real account. Only N changes.

Same nodes. Same C flowing through. Same V possible. Different context behind N. Run the graph four times and see whether it still holds:

- **Day one** -- nothing in the account. Every list is empty; the graph must still be legible.
- **Year three** -- 40,000 records, titles twice as long as the mock. Nothing may reflow into nonsense.
- **Least access** -- the read-only member. Which affordances vanish, and does the layout survive their absence?
- **Small and slow** -- one hand, poor network, reduced motion on. The graph re-routes; it does not degrade.

If the design only works with ideal data, it is not a design — it is a screenshot. This is the payoff of separating C, V and N: you prove the interface by swapping what is behind N and watching the graph hold its shape.

## 10. Markup is C, state styles are V

The separation of C (§2) and V (§4) maps directly to how the interface is built:

- **the component tree** -- the happy path. Every element is content flowing through the graph. No state branching inside.
- **the recipe variants** -- the complete V enumeration. Before writing them, read the actual states the surface can be in. Every one is named and styled — none is left to the browser default.

This is not a stylistic preference. If state handling lives inside the tree, the content path and the void path are tangled — you cannot read the layout without wading through conditionals, and no one can tell which states were designed and which were merely reached.

The tree IS the flow graph from §2. The variants ARE the void enumeration from §4.

### One method, two materials

The mapping is exact by construction. Anywhere the two columns disagree, one of the two graphs is wrong — most often the interface, because it is the one that gets drawn before it is thought.

| § | DESIGN THINKING | DESIGN GRAPH |
|---|-----------------|--------------|
| X | the problem to build | the job to get done |
| graph | functions and data flow | surfaces and moves |
| 1 | records, IDs, variants, errors | surfaces, units, states, moves |
| 2 | A — what flows | C — what is read and done |
| 3 | Effect or Stream | detail, list, or live |
| 4 | E — retry, escape, die | V — empty, loading, partial, error, denied |
| 5 | R — dependencies, proven | N — needs, satisfied on the edge |
| 6 | parse at the transport edge | validate at the field |
| 7 | pipe wraps the node | motion wraps the surface |
| 8 | scope the resource | scope the attention |
| 9 | swap R in tests | swap N in review |
| 10 | gen body = A, pipe = E | tree = C, variants = V |

---

## The Craft Pipeline

```
JOB
  -> "What are the surfaces?"                      -> define the interface language
  -> "What is the successful path?"                -> draw the flow graph (C)
  -> "One record, many, or live?"                  -> mark cardinality per surface
  -> "How can the content be absent?"              -> annotate void states (V)
  -> "What must be true to show this?"             -> annotate needs on the edges (N)
  -> "Where does their input enter?"               -> validate at the field
  -> "What wraps a surface without reshaping it?"  -> layer motion and feedback
  -> "What takes attention, and how is it given back?" -> scope every overlay
  -> "Does it hold on day one and year three?"     -> swap N and re-walk the graph
  -> "Does the build separate C from V?"           -> tree = C, variants = V
  -> INTERFACE                                     -> the interface IS the graph
```

**If a surface can render a state the graph cannot name, the design is wrong.**

---

## Output skeleton

Interface work renders in this fixed order, the UI twin of the
[Design Thinking output format](output-format.md). Same markers where the
meaning carries over (`(1)` detail, `(N)` list, `(T)` live, `🔒` field
boundary, `⛈` behavior layer).

```
JOB: <one line: what the person came here to get done>

Job → Flow → Surface<C, V, N>
│      │      │  │  │
│      │      │  │  └─ N: what the surface needs to exist   (§5)
│      │      │  └──── V: every way the content is absent   (§4)
│      │      └─────── C: what the person reads and does    (§2)
│      │
│      └─ nodes = surfaces, edges = the moves between them
│
└─ the job

SURFACES:    surfaces · units · states · moves
FLOW:        ascii flow graph, annotated inline:
             N: needs · V: empty|loading|partial|error|denied · 🔒 field → trusted
CARDINALITY: surface (1) detail · (N) list · (T) live
VOID:        every surface × its designed void states
NEEDS:       data · permission · prior step · viewport, satisfied on the edge
BOUNDARY:    every field where input becomes trusted, with its error sentence
BEHAVIOR:    motion, focus, feedback layers that wrap a surface without reshaping it
ATTENTION:   overlays: acquire@move → release@confirm|cancel|escape
PROOF:       day one · year three · least access · small and slow
VERDICT:     does every rendered state have a name on the graph?
```
