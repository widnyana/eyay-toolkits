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
 *   /dt approve|deny  arm/revoke file edits for the next agent run
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

/** Compact distilled prompt block injected while active. */
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
  first is fine; the FIRST edit is not allowed before the graph. Once the
  user runs /dt approve, edits are armed for the NEXT run: implement the
  approved design without re-presenting the graph.
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
  The extension blocks write/edit tools mechanically until the user runs
  /dt approve — it arms the NEXT run, cleared when that run ends. Re-approve
  per implementation round. Present the graph first.
NEVER read references/<skill-name>.md — no such files exist.
`.trim();

// pi's file-edit tools — the mechanical gate's scope ("file edits"). Bash
// stays open for read-only exploration. apply_patch/multiedit are Claude Code
// tool names that never fire in pi; keep this list to real pi mutators.
const MUTATING_TOOLS: Record<string, true> = {
	write: true,
	edit: true,
};

interface DtState {
	enabled: boolean;
}

const GATE_REASON =
	"Design Thinking mode is ON: present the Design Graph (Graph Protocol) and wait for user approval before file edits. The user arms the NEXT run with /dt approve; the approval clears when that run ends.";

export default function designThinkingExtension(pi: ExtensionAPI) {
	let enabled = false;
	// Armed by /dt approve for the NEXT agent run. Cleared when that run ends
	// (agent_end), by /dt deny, or when the mode turns off. Not persisted.
	let editsApproved = false;

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

	// /dt — the Design Thinking tool. Toggles mode; on|off|status set/query;
	// approve|deny arm/revoke file edits; anything else runs as a prompt with mode on.
	pi.registerCommand("dt", {
		description: "Design Thinking mode: /dt toggles, on|off|status set/query, approve arms the next run for file edits, deny revokes; anything else runs as a prompt with mode on",
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim();
			const lower = arg.toLowerCase();

			if (lower === "status") {
				ctx.ui.notify(`Design Thinking mode: ${enabled ? "on" : "off"}${editsApproved ? " (file edits armed for the next run)" : ""}`, "info");
				return;
			}

			if (lower === "approve") {
				if (!enabled) {
					ctx.ui.notify("Design Thinking is OFF — nothing to approve. Run /dt on first.", "info");
					return;
				}
				editsApproved = true;
				ctx.ui.notify("Design Thinking: file edits armed (current or next run) — it may implement the approved design without re-presenting the graph", "info");
				return;
			}
			if (lower === "deny") {
				if (!editsApproved) {
					ctx.ui.notify("Design Thinking: no approval in effect — file edits are already blocked", "info");
					return;
				}
				editsApproved = false;
				ctx.ui.notify("Design Thinking: file edits blocked again", "info");
				return;
			}

			// "on"/"off" set explicitly; anything else is a prompt to run in this
			// mode and always turns the mode ON (never toggles it off); bare /dt toggles.
			const prompt = /^(on|off|status)$/.test(lower) ? "" : arg;
			enabled = lower === "on" || prompt ? true : lower === "off" ? false : !enabled;
			if (!enabled) editsApproved = false;
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

	// While active, append the distilled block to the system prompt every run.
	pi.on("before_agent_start", async (event) => {
		if (!enabled) return undefined;
		return {
			systemPrompt: event.systemPrompt + "\n\n" + DISTILLED + "\n",
		};
	});

	// An approved run consumes the approval: clear it when the run ends so
	// later runs are gated again until the user re-approves with /dt approve.
	pi.on("agent_end", async () => {
		editsApproved = false;
	});

	// Hard gate: while enabled, file-edit tools are blocked until the user
	// arms the next run with /dt approve. Prompt-level rules alone proved
	// insufficient — this is the mechanical backstop.
	pi.on("tool_call", async (event) => {
		if (!enabled || editsApproved) return undefined;
		if (!MUTATING_TOOLS[event.toolName]) return undefined;
		return { block: true, reason: GATE_REASON };
	});
}
