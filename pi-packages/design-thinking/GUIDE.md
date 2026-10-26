# design-thinking: guide, tips, and tricks

This guide covers the Claude Code plugin and the pi / omp package. They share the
same methods, references, and commands. Where the two harnesses behave differently,
the section says so.

## The idea in one paragraph

Draw the graph before you write the code. Nodes are functions (or screens, or
agent tasks), edges are what flows between them, and every failure path gets a
name. Then the code must match the graph. If it does not, one of the two is
wrong, and a review can show which one.

The method comes from r17x's gist:
https://gist.github.com/r17x/90eb2f7be93932b5693753aedb09c01a

## Pick the right method

| You are working on | Method | Shape | Where it shows up |
|---|---|---|---|
| Code: a feature, a fix, a refactor | Design Thinking | `X → Graph → Effect<A, E, R>` | `/cg`, `/cg-plan`, `/cg-review`, `/cg-map`, `/dt` |
| An interface: screens, flows, components | Design Graph | `Job → Flow → Surface<C, V, N>` | `/cg-plan` and `/cg-review` switch to it for interface tasks |
| Work split across subagents or workers | Graph Protocol | `X → Graph → Delegation<A, E, R>` | `/cg-plan` adds it when a task needs more than one worker |
| A research topic | Meta Research Prompt Generator | waves of research, review, index, synthesis agents | `/research-prompt` |

The letters mean the same thing in every method:

- **A (or C)**: what flows on the happy path.
- **E (or V)**: every way it breaks (or every way the content can be missing).
- **R (or N)**: what each node needs before it can run (or before a screen can show).

## Commands at a glance

| Command | Use it when |
|---|---|
| `/dt` | You want every plan and review in this session drawn as a graph first. Bare `/dt` toggles. `/dt on`, `/dt off`, `/dt status` set or show it. |
| `/dt <prompt>` | You want to start a task with the mode on. It turns the mode on (never off) and runs the prompt. |
| `/cg <module or task>` | You want to see how existing code flows, or sketch the flow of a new task. |
| `/cg-plan <task>` | You are about to build something and want the design agreed first. |
| `/cg-review [target]` | You finished a change and want to check the code against its graph. No target means the current `git diff`. |
| `/cg-map <language or framework>` | The stack is new to you, or to the agent, and you want the markers mapped to its idioms first. |
| `/research-prompt <topic>` | You want a multi-agent research run on a topic, run here or delegated to claude, pi, or omp. |

Claude Code: if another plugin has a command with the same name, use the full name,
for example `/design-thinking:cg-plan`.

## A normal working loop

1. `/dt on` at the start of a session where real design decisions happen.
2. `/cg-map <stack>` once per stack, only if the stack vocabulary is unclear.
3. `/cg-plan <task>`. Read the graph. Push back on the graph, not on the code.
4. Approve (see "How approval works" below). The agent implements to match the graph.
5. `/cg-review` on the diff. It rebuilds the graph the code really implements and
   compares it with the plan.
6. `/dt off` when you are done.

## How approval works

**pi and omp** have a mechanical gate. While `/dt` is on and nothing is approved,
file edits, shell commands, and code execution are blocked. Read-only tools still
work. When a run ends with a graph, a dialog opens:

- **Approve**: the gate opens and implementation starts at once.
- **Refine**: you type feedback, the agent updates the graph, and the dialog opens again.
- **Approve + auto-mode**: same as Approve, and later graphs are approved without a dialog.
- **Deny**: everything stays blocked until a new graph is shown.

The approval covers one instruction from you. When you send a new message, the gate
closes again and the agent folds your message into the existing graph. Sessions
with no UI use `/dt approve` and `/dt deny` instead.

Auto-mode skips the dialog: `/dt auto on` arms the gate whenever the agent shows a
graph. The agent must still show the graph first. `/dt auto off` turns it off,
`/dt auto status` shows the state.

**Claude Code** has no mechanical gate. The mode is a rule the agent follows: graph
and questions first, no edits until you say go. Say "approved" or "go ahead" in
plain words.

## Reading a graph quickly

Read these sections first. They catch most problems:

1. **PROBLEM**: one line. If it is vague, stop and fix it before anything else.
2. **GRAPH**: follow the arrows. Every arrow should carry something you can name.
3. **VERDICT**: does it say what the code must satisfy, or name the mismatches?

The markers:

| Marker | Meaning |
|---|---|
| `⟳retry[×n]` | transient failure, try again |
| `↯escape(alt)` | recoverable, return an alternative |
| `☠die` | a bug or broken invariant, not a domain error |
| `🔒 x → y` | untrusted data becomes trusted here, and only here |
| `(1)` `(N)` `(T)` | runs once, many values over time, valid for a time window |
| `⛈ name` | a layer that wraps the node (logging, retry policy) without changing it |
| `@scope` | where a resource is acquired and released |

Red flags worth a comment before you approve:

- A failure with no marker. Someone will swallow it later.
- `☠die` on something a user can cause. That is a domain error, not a bug.
- Validation in the middle of the graph instead of at a `🔒` edge.
- TEST LAYERS that needs a mock of half the world. The node does too much.
- A `(N)` node drawn as `(1)`, for example a paginated API treated as one call.

## Tips for `/cg`

- Name a real entry point: `/cg src/http/router.ts` or `/cg "what happens on POST /orders"`.
  A vague target gives a vague graph.
- Every node in a trace comes with `path:line` under `src:`. If a line is missing or
  wrong, ask the agent to verify it. The format forbids guessed paths.
- The **Tests** section appears only when the test wiring differs from production.
  That difference is exactly what the tests swap out, so read it.
- A plain fact question ("what port does X use") gets a plain answer, no graph.

## Tips for `/cg-plan`

- Give the task with its constraints: `/cg-plan add per-user rate limit, Redis is already a dependency, 429 with Retry-After`.
- Interface tasks get the Design Graph skeleton (JOB, SURFACES, FLOW, VOID, NEEDS,
  ATTENTION, PROOF). Check the VOID section: empty, loading, partial, error, and
  denied each need a design, not a default.
- A small task stops after the graph. A task with two or more independent parts
  gets a delegation plan: a DELEGATED GRAPH with waves and one AGENT SUBGRAPH per
  node. Each worker then returns a RETURN block, and the agent ends with an
  IMPLEMENTED GRAPH that lists OFF-SCRIPT work and GAPS.
- Nodes that touch the same files never run in the same wave. If you see that, the
  plan is wrong.
- Keep the plan graph in the session. `/cg-review` compares against it.

## Tips for `/cg-review`

- Run it with no argument right after implementation: it reviews `git diff`.
- Point it at one module when the diff is large: `/cg-review src/billing/`.
- Findings are grouped by § number (1 to 10). §2 (tangled happy path) and §4
  (unhandled breaks) are usually the ones that cause incidents.
- For delegated work, give it the delegated graph and the workers' RETURN blocks.
  It compares each subgraph with what was really built.

## Tips for `/cg-map`

- Run it once per stack and keep the answer in the session. Later plans and reviews
  reuse the vocabulary.
- Good inputs are specific: `/cg-map rust tokio axum`, `/cg-map python fastapi sqlalchemy`.

## `/research-prompt`: research runs

One command writes the research prompt and then runs it. You choose who does the
work with `DELEGATE:`, from either harness:

| Start in | `here` (default) | `claude` | `pi` / `omp` | `print` |
|---|---|---|---|---|
| Claude Code | this session coordinates, `Agent` subagents in the background, `Monitor` prints a line per finished node | a background `claude -p` process, watched by `Monitor` | a background `pi` / `omp` process, watched by `Monitor` | write the prompt, print the command, stop |
| pi / omp | this session coordinates, `Agent` (pi-subagents) or `task` (omp) subagents, the subagent widget shows progress | a background `claude -p` process, watched by a watcher subagent | a background `pi` / `omp` process, watched by a watcher subagent | same |

```
/research-prompt nix store
REFS: ./docs/prior-research.md, https://nixos.org/manual
DELEGATE: pi
Focus on garbage collection internals and binary cache trust model.
```

Input fields, in any order after the first line:

- `NAME: <kebab-case>`: the project name. Without it, the first plain line becomes the name.
- `REFS: a, b`: files or URLs the researchers read first. Bare `./`, `/`, `~/`, or `http` tokens count too.
- `DEPENDS_ON: name1, name2`: earlier research projects to build on.
- `DELEGATE: here | claude | pi | omp | print`: who runs it. Default `here`.
- Any other text: context that focuses the topics.

Everything lives under `./research/` in the directory where you run it:

```
./research/
  projects/<NAME>/.<NAME>.research.prompt   the coordinator prompt
  projects/<NAME>/.<NAME>.run.log           engine output (DELEGATE claude, pi, omp)
  projects/<NAME>/RESEARCH.md               the final document
  scratch/                                   per-node working files
  ref/INDEX.md, ref/<repo>/, ref/<file>     cloned repos and downloaded specs
```

Picking a lane:

- `here`: simplest, and you see each subagent. Your session is busy until the run ends
  (about 40 minutes for a five-node topic). Only the RETURN blocks enter your context,
  not the research files.
- `pi` from Claude Code: cheap workers do the reading and writing, while Claude watches and
  reports. Your Claude session stays free while it runs.
- `claude` from pi: a stronger engine for a hard topic, started from a pi session.
- `print`: r17x's original two-step flow. Read the prompt first, then run the printed
  command yourself, for example on another machine or in CI.

Tips:

- A delegated engine needs its binary on PATH (`claude`, `pi`, or `omp`). If it is missing,
  the command stops and prints the line to run yourself.
- pi needs pi-subagents for parallel waves. Without a subagent tool, nodes run one by one.
- On pi and omp, the watcher subagent is what tells your session the delegated run ended.
  If it stops early (turn or tool limit), ask "status of the research run": the agent reads
  the run log and `scratch/`.
- Progress by hand from a second terminal: `ls -lt research/scratch research/ref`. Scratch
  files appear when each node finishes, so an empty `scratch/` early in wave 1 is normal.
- Run it in a scratch or research directory, not inside a code repo you care about:
  `research/ref/` gets full `git clone` copies, and code indexers will pick them up.
- No model is pinned. Each engine uses its own default. With `DELEGATE: print` you can add
  `--model <name>` to the printed line.
- Interrupted run: run `/research-prompt` again with the same NAME and DELEGATE. Finished
  nodes are skipped. With `print` it lists COMPLETE / MISSING nodes and prints a resume command.
- Finished project: the same NAME is refused. Build on it with `DEPENDS_ON: <NAME>` under a
  new name.
- Add `research/scratch/` and `research/ref/` to `.gitignore` unless you want cloned repos in
  your history. `research/projects/*/RESEARCH.md` is the part worth keeping.
- pi with `/dt` on: the prompt file write goes through the approval gate. Approve it, or
  `/dt off` first.

## Harness differences

| | Claude Code | pi / omp |
|---|---|---|
| Install | `/plugin install design-thinking@eyay-toolkits` | `pi install npm:@widnyana/design-thinking` or `omp install npm:@widnyana/design-thinking` |
| `/dt` state | `.claude/design-thinking.local.md` in the project, re-announced at session start | kept in the session; shown in the status bar |
| Edits before approval | rule only | blocked mechanically, dialog to approve |
| Specs the agent reads | the `design-thinking`, `design-graph`, `graph-protocol` skills and `references/` | the package `references/` directory (absolute path injected while `/dt` is on) |
| LSP reminder | no | yes, always on: use the language server when the session has one |

Claude Code: add `.claude/*.local.md` to `.gitignore`. It is per-user state.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| pi: every edit is blocked | `/dt` is on and nothing is approved. Approve in the dialog, or `/dt off`. |
| pi: no dialog appears | The run did not end with a graph (it needs VERDICT plus at least three other sections), or the session has no UI. Use `/dt approve`. |
| pi: `pi -p "/research-prompt ..."` writes nothing | Print mode runs the slash command and exits before the queued message runs. Use an interactive session (or RPC mode). |
| Delegated run says `ENGINE DIED` | The engine exited without an IMPLEMENTED GRAPH. Read the last lines it shows from `.<NAME>.run.log`, fix the cause, and run the same command again to resume. |
| Claude Code: mode lost after restart | Check `.claude/design-thinking.local.md` says `enabled: true`. The hook reads it at session start. |
| Graph uses a header like `DesignGraph<A, E, R>` | Old version. Update: the current header is `X → Graph → Effect<A, E, R>`. |
| `/research-prompt` says the prompt already exists | A run was started before. Use the printed resume command, or pick a new NAME. |
| The agent writes prose instead of a graph | Ask for "the full output format". Specs: `references/output-format.md`. |

## When not to use it

- One-line fixes, typos, renames, config value changes. Prose is fine.
- Questions with a single fact as the answer.
- Throwaway spikes you will delete. Draw the graph when the spike becomes real code.

## Where the specs live

All in the package's `references/` directory:

- `design-thinking.md`: the code method, §1 to §10.
- `output-format.md`: sections, markers, call graph block, completeness checklist.
- `design-graph.md`: the interface method and its skeleton.
- `graph-protocol.md`: delegation, AGENT SUBGRAPH, RETURN, IMPLEMENTED GRAPH.
- `meta-research.md`: the research prompt generator.
- `effect-ts.md`: the original Effect-TS version, for attribution.
