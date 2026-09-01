/**
 * Design Thinking — pi extension
 *
 * Adopts the three pillars:
 *   - Design Thinking : the mindset (§1–§10 pipeline, problem-first)
 *   - Design Graph    : the artifact (annotated call graph of a concrete problem)
 *   - Graph Protocol  : the notation spec (fixed sections, fixed markers)
 *
 * When /dt mode is active, every turn appends a compact distilled block to the
 * system prompt so design/plan/review answers render as Design Graphs in
 * Graph Protocol form. Full specs live in the package's references/ directory,
 * loaded on demand — not inlined here, to keep the injected prompt small.
 *
 * Commands:
 *   /dt            toggle Design Thinking mode
 *   /dt on|off     set explicitly
 *   /dt status     show current state
 *   /dt <prompt>   turn mode ON (never off), then run <prompt> as a user
 *                  message — graph + clarifying questions before implementation
 *
 * Stack-agnostic: no language detection, no auto-enable. Adapt the vocabulary
 * to whatever stack the project uses; never the discipline.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATE_TYPE = "design-thinking-state";

/**
 * Absolute path to the shipped references/ directory, resolved from this
 * file's own location (§6 boundary: import.meta.url → fs path). Works from
 * a repo checkout and from an npm install — e.g.
 * ~/.pi/agent/npm/node_modules/@widnyana/design-thinking/references — so
 * the model can actually read the full specs in /dt mode.
 */
const REF_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"references",
);

/** Compact distilled prompt block injected while active (~33 lines). */
const DISTILLED = `
DESIGN THINKING MODE — active.
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
- ANY turn that will end in code or file edits (feature, change, fix,
  refactor — the model does NOT get to reclassify the request): render the
  Design Graph in Graph Protocol form and any clarifying questions FIRST;
  ZERO file edits until the user approves the design. Reading/exploring code
  first is fine; the FIRST edit is not allowed before the graph.
- Design, plan, and review answers must render a Design Graph — fixed
  sections: PROBLEM, SHAPES, GRAPH, CARDINALITY, BOUNDARIES, BEHAVIOR, SCOPE,
  TEST LAYERS, VERDICT.
- The happy path (A) stays readable; failure handling lives at defined join points.
- Each layer scopes its own E; inner errors never leak through.
- If the code doesn't match the call graph, the implementation is wrong.
- Adapt vocabulary to the current language/stack; never the discipline.

Full specs — read these when a section needs detail:
- ${REF_DIR}/protocol.md      (Graph Protocol: notation spec + worked example)
- ${REF_DIR}/method.md        (the §1–§10 method, generalized)
- ${REF_DIR}/design-graph.md  (the artifact spec + completeness checklist)
Skills load BY NAME into the agent (/skill:<name>); the files above are named
by stem, NOT by skill name. Exact mapping:
  /skill:graph-protocol → protocol.md   /skill:design-method → method.md
  /skill:design-graph → design-graph.md
  Zero file edits are possible until the user runs /dt approve for the turn —
  the extension blocks write/edit tools mechanically. Present the graph first.
NEVER read references/<skill-name>.md — no such files exist.
`.trim();

const MUTATING_TOOLS: Record<string, true> = {
	write: true,
	edit: true,
	apply_patch: true,
	multiedit: true,
};

interface DtState {
	enabled: boolean;
}

const GATE_REASON =
	"Design Thinking mode is ON: present the Design Graph (Graph Protocol) and wait for user approval before file edits. The user can unlock this turn with /dt approve.";

export default function designThinkingExtension(pi: ExtensionAPI) {
	let enabled = false;
	// Per-turn approval flag: set by /dt approve, reset on every user turn.
	let approvedForTurn = false;

	function applyStatus(ctx: ExtensionContext) {
		ctx.ui.setStatus(
			"design-thinking",
			enabled ? "design-thinking: on" : undefined,
		);
	}

	function persist() {
		pi.appendEntry<DtState>(STATE_TYPE, { enabled });
	}

	function restore(ctx: ExtensionContext) {
		const branch = ctx.sessionManager.getBranch();
		let restored: boolean | undefined;
		for (const entry of branch) {
			if (entry.type === "custom" && entry.customType === STATE_TYPE) {
				const data = entry.data as DtState | undefined;
				if (data && typeof data.enabled === "boolean") {
					restored = data.enabled;
				}
			}
		}
		if (restored !== undefined) {
			enabled = restored;
		}
	}

	// Restore toggle state when a session starts, loads, or reloads.
	pi.on("session_start", async (_event, ctx) => {
		restore(ctx);
		applyStatus(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus("design-thinking", undefined);
	});

	// /dt — the Design Thinking tool. Toggles mode, or /dt on|off|status.
	pi.registerCommand("dt", {
		description: "Design Thinking mode: /dt toggles, on|off|status set/query, approve|deny unlock/lock file edits for this turn, anything else runs as a prompt with mode on",
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim();
			const lower = arg.toLowerCase();

			if (lower === "status") {
				ctx.ui.notify(`Design Thinking mode: ${enabled ? "on" : "off"}${approvedForTurn ? " (edits approved for this turn)" : ""}`, "info");
				return;
			}

			// /dt approve|deny — explicit user unlock/lock for the CURRENT turn.
			if (lower === "approve") {
				approvedForTurn = enabled;
				ctx.ui.notify(
					enabled ? "Design Thinking: file edits approved for this turn" : "Design Thinking is OFF — nothing to approve",
					"info",
				);
			}
			if (lower === "deny") {
				approvedForTurn = false;
				ctx.ui.notify("Design Thinking: file edits blocked again", "info");
				return;
			}

			// "on"/"off" set explicitly; anything else is a prompt to run in this
			// mode and always turns the mode ON (never toggles it off); bare /dt toggles.
			const prompt = /^(on|off|status)$/.test(lower) ? "" : arg;
			enabled = lower === "on" || prompt ? true : lower === "off" ? false : !enabled;
			if (!enabled) approvedForTurn = false;
			persist();
			applyStatus(ctx);
			ctx.ui.notify(
				enabled
					? "Design Thinking ON — plans and reviews will render as Design Graphs (Graph Protocol)"
					: "Design Thinking OFF",
				"info",
			);

			if (prompt) {
				// deliverAs "steer": sends immediately when idle, queues mid-stream.
				await pi.sendUserMessage(
					`${prompt}\n\n(Design Thinking is ON: before implementing, present the Design Graph (Graph Protocol) and any clarifying questions, then wait for my go-ahead.)`,
					{ deliverAs: "steer" },
				);
			}
		},
	});

	// While active, append the distilled block to the system prompt every turn.
	pi.on("before_agent_start", async (event) => {
		// A new user turn starts a fresh agent run: the approval from the
		// previous turn does not carry over.
		approvedForTurn = false;
		if (!enabled) return undefined;
		return {
			systemPrompt: event.systemPrompt + "\n\n" + DISTILLED + "\n",
		};
	});

	// Hard gate: while enabled, mutating tools are blocked until the user
	// approves the design for this turn (/dt approve). Prompt-level rules
	// alone proved insufficient — this is the mechanical backstop.
	pi.on("tool_call", async (event) => {
		if (!enabled || approvedForTurn) return undefined;
		if (!MUTATING_TOOLS[event.toolName]) return undefined;
		return { block: true, reason: GATE_REASON };
	});
}
