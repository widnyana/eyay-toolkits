---
name: graph-protocol
description: >
  Graph Protocol: the orchestration method. X → Graph → Delegation<A, E, R>:
  task nodes, execution graph in waves, delegation break points, worker
  requirements, AGENT SUBGRAPH prompt blocks, RETURN blocks, retry and
  evolution, IMPLEMENTED GRAPH compare. Use when splitting work across
  subagents or workers.
disable-model-invocation: true
---

> **Source**: Graph Protocol by [r17x](https://github.com/r17x), from
> https://gist.github.com/r17x/90eb2f7be93932b5693753aedb09c01a (`OPT_GRAPH_PROTOCOL.md`).
> Method text bundled as-is. The block formats at the end (execution graph,
> AGENT SUBGRAPH, IMPLEMENTED GRAPH, retry and evolution) are taken from r17x's
> "Meta Research Prompt Generator" ([meta-research.md](../../references/meta-research.md)) and
> made generic for any delegated task.

# Graph Protocol

The same method, turned on the orchestration. A task is not a checklist — it is a graph with nodes, edges, and channels, and the delegation you write is the subgraph the worker walks.

Design Thinking answers what flows through the program. Graph Protocol answers what flows through the orchestration. Same three-channel discipline: one channel for the work, one channel for where delegation breaks, one channel for what each agent needs.

```
X → Graph → Delegation<A, E, R>
│              │       │  │  │
│              │       │  │  └─ what each agent needs            (§5)
│              │       │  └──── where the delegation breaks      (§4)
│              │       └─────── what flows through agents        (§2)
│              │
│              └─ nodes = tasks, edges = data dependencies
│
└─ the problem: what you're trying to build

§1  Task Nodes    the nouns: files, modules, domains, workers
§2  A             happy path as execution graph
§3  Cardinality   one worker (SMALL) or many (MEDIUM/LARGE)
§4  E             break points: wrong context, missing input, misinterpretation
§5  R             requirements: subgraph, design method, verification, WHY
§6  Boundary      subgraph in, implemented graph out — structured at edges
§7  Behavior      observe wraps delegation without changing the graph
§8  Scope         worker attention is acquired and must be released
§9  Proof         compare delegated subgraph vs implemented graph
§10 Structure     prompt = subgraph, return = implemented graph
```

Read the problem. Draw the task flow as an execution graph. Delegate work that IS the subgraph. If the implemented graph does not match the delegated subgraph, the delegation is wrong.

## 1. Name the task nodes

What are the units of work? Before drawing an execution graph, define the orchestration language.

- **Nodes** -- the discrete units of work. A service change, a component update, a config edit. Each has a domain and a worker.
- **Domains** -- who owns the node. Each domain maps to a worker with the right expertise. One node, one owner.
- **Edges** -- data dependencies between nodes. Node C needs the output of nodes A and B. No edge means independent.
- **Waves** -- groups of independent nodes that run in parallel. Edges between waves create gates.

These are the nouns. The execution is the verbs. You cannot delegate until you know what depends on what.

## 2. Think A first

Map the successful task as an execution graph before spawning any worker.

```
wave1[A∥B] → gate → wave2[C] → wave3[D]
```

What is the happy path through the task? Which nodes are independent (parallel)? Which depend on prior results (sequential)? This graph IS your delegation plan. Draw it first. The spawning follows.

## 3. One or many?

Is the task one worker or many?

- **One worker** -- a small or trivial task. Single node, no execution graph needed. Inline the task in the prompt.
- **Many workers** -- a medium or large task. Multiple nodes, draw the execution graph. Each worker gets its subgraph.
- **Waves** -- independent nodes in the same wave spawn in parallel. The gate between waves waits for all prior nodes.

Same three channels (A, E, R) in all cases. Different cardinality. Mark it on the graph so the delegation matches.

## 4. Think E second

Mark where the delegation can break. Each break point is one of three things:

- **Wrong context** -- the worker does not understand the problem as deeply as the coordinator. Missing files, missing WHY, missing constraints.
- **Missing input** -- a node in wave 2 needs the output of wave 1, but the coordinator did not pass it. The edge is invisible.
- **Misinterpretation** -- the worker implements the LETTER of the delegation, not the INTENT. The subgraph was ambiguous.

Delegation failures are not worker failures — they are coordinator failures. The coordinator controls the prompt. If the worker misunderstands, the prompt was wrong.

## 5. Think R third

Mark what each worker needs before it can do the work. "The worker cannot do X if it does not have Y."

R is the delegation prompt completeness check. Every worker needs:
- **Subgraph** -- what to implement, in the notation the worker's domain expects
- **Design method** -- which methodology applies to this worker's domain, and which sections govern the work
- **Verification command** -- how the worker proves the work is correct
- **WHY** -- the reason this node exists, not just what to change

If any R is missing from the prompt, the worker will guess. Guessing is the source of misinterpretation (§4).

## 6. Trust at boundary

Where does unstructured data cross the orchestration boundary? The coordinator sends a prompt. The worker sends a result.

Structure at the boundary. The coordinator includes the subgraph in the prompt — not prose, not "fix the thing," but the graph the worker must implement. The worker returns the implemented graph in its result — not a bare signal, but the graph it actually built.

Trust nothing at the boundary. Trust everything inside. The boundary is the only place the graph is transferred. After that, the worker owns its subgraph.

## 7. Layer behavior

What wraps the delegation without changing the graph? Observations, session tracking, phase transitions.

The coordinator records the delegated subgraph BEFORE spawning. The worker records the implemented graph AFTER implementing. These observations wrap the delegation without changing what the worker does. The happy path stays clean — you can read it without wading through session tracking.

## 8. Scope attention

A worker is a resource. It is acquired (spawned) and must be released (completed with structured data).

The coordinator acquires a worker's attention by spawning it. The worker releases attention by completing with the implemented graph. Between acquire and release, the worker owns its subgraph. The coordinator does not interfere — it waits at the gate.

If a worker is spawned without a clear subgraph, its attention is wasted. If a worker completes without reporting its implemented graph, the data is lost. Acquire with structure. Release with data.

## 9. Compare to prove it

The delegated subgraph and the implemented graph must match. If they do not, something is wrong.

After the worker completes, the coordinator reads both records:
- The delegated subgraph (what was asked)
- The implemented graph (what was built)

Same nodes. Same A flowing through. Same E possible. If the implemented graph has nodes the delegated subgraph did not mention, the worker went off-script. If the delegated subgraph has nodes the implemented graph did not cover, the worker missed something. This is the payoff of structuring at the boundary — you prove the delegation correct by comparing graphs.

## 10. Prompt is subgraph, return is implemented graph

The separation of delegation (§6) and return (§7) maps directly to orchestration structure:

- **The prompt** -- carries the subgraph. The graph the worker must implement, in the notation the domain expects, with context and verification.
- **The return** -- carries the implemented graph. The graph the worker actually built, structured so the coordinator can compare it against the delegated subgraph.

This is not a stylistic preference. If the subgraph lives in prose and the return is a bare string, the delegation and verification are tangled — you cannot read what was asked without parsing natural language, and you cannot verify what was built without reading the entire diff. The prompt IS the delegated graph. The return IS the implemented graph.

---

## The Protocol Pipeline

```
TASK
  -> "What are the task nodes?"                       -> define nodes, domains, edges
  -> "What is the happy path?"                        -> draw the execution graph (A)
  -> "One worker or many?"                            -> mark cardinality
  -> "Where can the delegation break?"                -> annotate break points (E)
  -> "What does each worker need?"                    -> annotate requirements (R)
  -> "Where does the graph cross boundaries?"         -> subgraph in, implemented graph out
  -> "What wraps delegation without changing it?"     -> observe before and after
  -> "What resources need release?"                   -> scope worker attention
  -> "Does the implemented graph match?"              -> compare delegated vs implemented
  -> "Does my prompt separate subgraph from prose?"   -> prompt = subgraph, return = graph
  -> DELEGATION                                       -> the delegation IS the subgraph
```

**If the implemented graph does not match the delegated subgraph, the delegation is wrong.**

---

## Block formats

The method says the prompt IS the subgraph and the return IS the implemented
graph. These are the fixed blocks that carry them. Emit them with no prose
around them.

### When to use them

Apply §3 first. One worker (a small task, one node) needs no execution graph:
do the work, or inline the task in one prompt. Many workers (two or more
nodes, or any node a separate agent will run) get all blocks below.

### 1. Execution graph (the delegated graph)

Emit before any agent is spawned.

```
DELEGATED GRAPH: <task name>

NODES:
  N1   domain=<owner>   output=<file, dir, or commit>   status=pending|pre-done
  N2   domain=<owner>   output=<...>                    status=pending|pre-done
  ...

EDGES:
  N1 → N3        (N3 reads N1.output)
  N2 → N3

WAVES:
  WAVE 1 : [N1 ∥ N2]   — <purpose>
  WAVE 2 : [N3]        — <purpose>
```

Constraints:
- One node, one owner, one output.
- No edge between two nodes means they are independent and share a wave.
- A node whose output already exists and is non-empty is `pre-done`: do not
  spawn it, count it as done for gating.
- Nodes that touch the same files never share a wave.

### 2. AGENT SUBGRAPH (the prompt)

One per node, passed to the agent verbatim with values filled in. No preamble.
This block covers every R from §5: subgraph, design method, verification, WHY.

```
═══════════════════════════════════════════════════
AGENT SUBGRAPH — <node id> <short title>
═══════════════════════════════════════════════════

WHY          : <the reason this node exists, not only what to change>
INPUTS       : <outputs of upstream nodes this node reads, or none>
OUTPUT       : <exact path(s) or artifact this node must produce>
METHOD       : <which method and sections govern the work, e.g. Design Thinking §2 §4 §6>
SUBGRAPH     : <this node's slice of the design graph, in the method's notation>
VERIFY       : <command that proves the work, or "coordinator verifies">
CONSTRAINTS  : <files it may touch, files it must not touch, rules>

TASK
────
1. <bounded step>
2. <bounded step>
...

OUTPUT must exist before returning.

RETURN:
  STATUS            : done | failed | evolved
  OUTPUT            : <path(s)>
  IMPLEMENTED GRAPH : <the graph actually built, same notation as SUBGRAPH>
  VERIFY_RESULT     : <pass | fail + first failing line | not run>
  SUMMARY           : <3-5 sentences>
  EVOLVED_SCOPE     : <new scope, only if evolved>
  FAILURE_REASON    : <only if failed>

RETRY : coordinator re-spawns once on failure with identical subgraph.
EVOLVE: coordinator re-plans the node on evolved; see Evolution.
═══════════════════════════════════════════════════
```

### 3. Gates

After each wave: collect every RETURN. Re-spawn any `failed` node once.
Handle `evolved` nodes (below) before the next wave. A node that fails twice is
FAILED: downstream nodes proceed without its output and say so. WAVE n+1 never
starts before WAVE n is done or FAILED.

### 4. Retry

1. Agent returns `STATUS=failed`.
2. Re-spawn once with the identical subgraph. No changes.
3. Second failure: mark FAILED, add to FAILURES.
4. Never retry more than once. Never change the subgraph on retry.

### 5. Evolution

When a node returns `STATUS=evolved` (the work showed the scope must change to
produce a useful output), the coordinator, not the worker, updates the node:

1. Rewrite that node's AGENT SUBGRAPH with the new scope. Keep every other
   field.
2. If the change adds or removes edges, update the DELEGATED GRAPH and say so.
3. Re-spawn the node with the updated subgraph. If it then fails, apply Retry.
4. Record the change in EVOLUTIONS.

### 6. Implemented graph (the return)

Emit after the last wave. No prose around it.

```
═══════════════════════════════════════════════════
IMPLEMENTED GRAPH: <task name>
═══════════════════════════════════════════════════

WAVE 1 — <purpose>
  N1  status=done|pre-done|failed  output=...  verify=...
  N2  status=done|pre-done|failed  output=...  verify=...

WAVE 2 — <purpose>
  N3  status=...                   output=...  verify=...

FAILURES   : [node ids that failed after retry, or none]
EVOLUTIONS : [{ node, original_scope, evolved_scope }, or none]
OFF-SCRIPT : [nodes or files in implemented graphs that no subgraph asked for, or none]
GAPS       : [delegated nodes or files no implemented graph covers, or none]
VERDICT    : matches | mismatches listed above
═══════════════════════════════════════════════════
```

Compare every RETURN's IMPLEMENTED GRAPH with its SUBGRAPH (§9). Do not trust
a worker's own "pass": re-run VERIFY yourself where you can.

### 7. Invariants

1. One node, one owner, one output.
2. Every spawned agent gets an AGENT SUBGRAPH. No free-text delegation.
3. Every agent returns a RETURN block. A bare "done" is a failed return.
4. WAVE n+1 never starts before WAVE n completes (modulo FAILED nodes).
5. The implemented graph is structurally the same as the delegated graph, or
   the VERDICT names each difference.

### Harness note

Spawn each node with the harness's subagent tool: `Agent` in Claude Code, the
built-in task tool in omp, a subagent plugin in pi. When no subagent tool
exists, run the nodes yourself in wave order. Use the same AGENT SUBGRAPH as
your own instructions for that node, and write the same RETURN block.
