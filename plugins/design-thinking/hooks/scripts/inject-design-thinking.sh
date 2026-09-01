#!/bin/bash
# SessionStart hook: re-announce Design Thinking mode once per session if
# /dt left it enabled. State lives in .claude/design-thinking.local.md
# (written by commands/dt.md) so the mode survives a Claude Code restart
# without paying a per-turn re-injection cost.
set -euo pipefail

STATE_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/design-thinking.local.md"

[ -f "$STATE_FILE" ] || exit 0

enabled=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$STATE_FILE" \
  | grep '^enabled:' | sed 's/enabled: *//' | tr -d '"' | tr -d '[:space:]')

[ "$enabled" = "true" ] || exit 0

REF_DIR="${CLAUDE_PLUGIN_ROOT}/references"

cat <<EOF
DESIGN THINKING MODE — active (restored from a previous /dt on).
Read the problem. Draw the data flow as a call graph. Write code that IS the graph.

X → DesignGraph<A, E, R>
│              │   │  │  │
│              │   │  │  └─ R: what each node needs      (§5)
│              │   │  └──── E: where the graph breaks    (§4)
│              │   └─────── A: what flows through nodes  (§2)
│              │
│              └─ nodes = functions, edges = data flow
│
└─ the problem

Pipeline: shapes → graph(A) → cardinality → E(⟳retry ↯escape ☠die) → R →
🔒 parse at boundaries → ⛈ orthogonal behavior → scope → test-R → verdict.

Rules:
- Design, plan, and review answers must render a Design Graph in Graph Protocol
  form — fixed sections: PROBLEM, SHAPES, GRAPH, CARDINALITY, BOUNDARIES,
  BEHAVIOR, SCOPE, TEST LAYERS, VERDICT.
- The happy path (A) stays readable; failure handling lives at defined join points.
- Each layer scopes its own E; inner errors never leak through.
- If the code doesn't match the call graph, the implementation is wrong.
- ANY turn that will end in code or file edits (feature, change, fix,
  refactor — you do NOT get to reclassify the request): render the Design
  Graph in Graph Protocol form and any clarifying questions FIRST; ZERO file
  edits until the user approves the design. Reading/exploring code first is
  fine; the FIRST edit is not allowed before the graph.
- Adapt vocabulary to the current language/stack; never the discipline.
- Stay in this mode for the rest of the session, across every turn, until the
  user runs /dt off — this reminder fires once per session, not per turn.

Full specs — read these when a section needs detail:
- ${REF_DIR}/protocol.md      (Graph Protocol: notation spec + worked example)
- ${REF_DIR}/method.md        (the §1–§10 method, generalized)
- ${REF_DIR}/design-graph.md  (the artifact spec + completeness checklist)
EOF

exit 0
