# design-thinking — a pi package

**Design Thinking · Design Graph · Graph Protocol** — a stack-agnostic design
methodology for [pi](https://pi.dev). It turns every plan, review, and refactor
into an annotated call graph: nodes are functions, edges are data flow.

> **Attribution**: the underlying methodology is the work of
> [r17x](https://github.com/r17x) —
> [Design Thinking (gist)](https://gist.github.com/r17x/90eb2f7be93932b5693753aedb09c01a),
> originally formulated for Effect-TS. This package is widnyana's
> transformation of those concepts into a general, language-neutral pi
> extension and prompt set. See [LICENSE](LICENSE).

## The three pillars

| Pillar | What it is |
|---|---|
| **Design Thinking** | The mindset: problem-first, a §1–§10 pipeline — shapes → happy path (A) → cardinality → break points (E) → requirements (R) → boundaries → behavior layers → scope → test layers → verdict. |
| **Design Graph** | The artifact: the annotated call graph of a concrete problem. Drawn before code, reconstructed from code, diffed against code. |
| **Graph Protocol** | The notation: fixed sections and markers (`⟳retry ↯escape ☠die 🔒boundary (1)(N)(T)`) so graphs from any language render identically and are mechanically checkable. |

Language-neutral by design: Go, Rust, Python, TypeScript, SQL — the graph is
the same, only the vocabulary inside annotations changes.

## Preview

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

GRAPH:
  load_state → plan → fetch → download → write → report
  │                       │                  │
  │                       ├─ E: NetErr ⟳retry×3 → ↯escape(skip)
  │                       └─ 🔒 raw bytes → Downloaded
  └─ 🔒 state file → trusted
```

## Install

```bash
# from npm (listed at https://pi.dev/packages)
pi install npm:@damarseta/design-thinking

# pinned version
pi install npm:@damarseta/design-thinking@1.0.0

# from a local checkout of this repo
pi install /absolute/path/to/pi-packages/design-thinking

# try without installing
pi -e npm:@damarseta/design-thinking
pi -e ./pi-packages/design-thinking
```

> The `npm:` prefix is required — a bare name is parsed by pi as a local
> path, not an npm package.

## Publishing

The package is published to npm from its own directory in this monorepo
(`repository.directory` is set for npm/`pi.dev` linking):

```bash
cd pi-packages/design-thinking
npm login                 # token lands in ~/.npmrc, never in the repo
npm publish --dry-run     # verify tarball contents first (verify_pack)
pi -e .                   # verify /dt + prompts load (verify_load)
npm publish --access public   # scoped packages default to private; public is free
```

Publishing requires the `@damarseta` scope to exist — create the free npm
org at https://www.npmjs.com/org/create (or own the `damarseta` username);
npm rejects publishes to a scope you don't control with 403 Forbidden.
Bump `version` in `package.json` for every publish — npm rejects duplicate
versions.

## Usage

| Command | What it does |
|---|---|
| `/dt` | Toggle Design Thinking mode. While on, plans and reviews render as Design Graphs in Graph Protocol form. Persists across restarts. `/dt on\|off\|status` also work. |
| `/cg <module \| task>` | Generate a call graph: extract the graph existing code implements, or sketch one for a task. |
| `/cg-plan <task>` | Design before code — full Design Graph, then implement to match it. |
| `/cg-review [file\|module\|diff]` | Reconstruct the implemented graph and diff it against the method's checklist; findings grouped by § number, ends with a VERDICT. |
| `/cg-map <language\|framework>` | Map the Protocol vocabulary onto a stack's idioms (Result vs exceptions, RAII vs defer, DI patterns). |

## Structure

```
design-thinking/
├── extensions/design-thinking.ts   # /dt toggle + system-prompt injection
├── prompts/                        # /cg, /cg-plan, /cg-review, /cg-map
├── skills/                         # loaded on demand (progressive disclosure)
│   ├── graph-protocol/   # = references/protocol.md, as a skill
│   ├── design-method/    # = references/method.md, as a skill
│   └── design-graph/     # = references/design-graph.md, as a skill
└── references/
    ├── protocol.md      # source of the graph-protocol skill
    ├── method.md        # source of the design-method skill
    ├── design-graph.md  # source of the design-graph skill
    └── effect-ts.md     # r17x's original gist, verbatim (archival, NOT a skill)
```

## License

MIT — original concepts © r17x, pi adaptation © Widnyana Putra. See
[LICENSE](LICENSE).
