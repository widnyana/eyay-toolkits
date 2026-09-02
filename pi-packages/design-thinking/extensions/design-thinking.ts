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
 *   /dt approve|deny  manual arm/revoke fallback (headless / no-UI sessions)
 *   After a gated run presents a Design Graph, a review dialog opens
 *   automatically: Approve (arm + implement), Refine (send feedback), or
 *   Deny (keep file edits blocked). /dt <prompt> turns the mode ON (never
 *   off) and runs the prompt — graph + clarifying questions before code.
 *
 * Approval gate design (one state machine, one owner):
 *   - The gate is `{ mode: "off" | "on", approval: "none" | "armed" }`. Every
 *     change goes through a transition function; handlers never touch the
 *     fields directly.
 *   - At most one review dialog exists. Each offer carries an epoch; a dialog
 *     decision is applied only if its epoch is still current AND the gate is
 *     still on AND still unapproved. Stale decisions are discarded, not
 *     applied.
 *   - Dialogs are opened with an extension-owned AbortSignal: omp binds
 *     handler-opened dialogs to the handler's 30s abort scope, and a floating
 *     promise does not escape that binding. If the dialog is still dismissed
 *     (runtime kill, or the agent's own dialog displacing it), the offer is
 *     retracted and a fresh one opens at the next run end. No reopen loops,
 *     no timing heuristics.
 *   - An explicit Deny latches until a NEW graph is presented: deny means
 *     stop asking.
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
  first is fine; the FIRST edit is not allowed before the graph. When the run
  ends, a review dialog opens: approve (implement the presented design
  without re-presenting the graph), refine (present an updated graph), or
  deny (stay blocked).
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
  The extension blocks write/edit tools mechanically until the user approves
  — a review dialog opens when a graph-presenting run ends. Approval arms
  one run, cleared when that run ends. Re-approve per implementation round.
  Present the graph first.
  NEVER ask the user to run /dt approve, /dt deny, or any approval command:
  the dialog is automatic, and mentioning commands just confuses the flow.
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
	"Design Thinking mode is ON: this file edit is blocked until the user approves the presented design. Present (or re-present) the Design Graph (Graph Protocol), then END YOUR TURN — an approval dialog opens for the user automatically when the run ends. NEVER ask the user to run /dt approve, /dt deny, or any command; NEVER re-attempt the edit this turn.";

const REVIEW_OPTIONS = [
	"Approve — implement now",
	"Refine — ask the agent for changes",
	"Deny — keep file edits blocked",
] as const;

const GO_AHEAD_MESSAGE =
	"Approved — implement the presented design now. (Design Thinking file-edit gate is armed for this run; go straight to implementation, no graph re-presentation.)";

const VERDICT_PATTERN = /\bVERDICT\b/;

/** Does an assistant message contain a rendered Design Graph? The protocol's
 *  VERDICT section is mandatory, so it only appears on a real rendering. */
function presentsGraph(message: { role: string; content?: unknown }): boolean {
	if (message.role !== "assistant") return false;
	if (typeof message.content === "string") return VERDICT_PATTERN.test(message.content);
	return VERDICT_PATTERN.test(JSON.stringify(message.content ?? ""));
}

interface Offer {
	epoch: number;
	abort: AbortController;
}

export default function designThinkingExtension(pi: ExtensionAPI) {
	// ── Gate state — the ONLY mutable state; change it via the transitions
	// below, never inline in a handler. ─────────────────────────────────────
	let mode: "off" | "on" = "off";
	// "armed" lets mutating tools through; consumed when an armed run actually
	// used them. An arm from /dt approve must survive its own (idle) command
	// run and apply to the next real run — hence consume-on-use at run end,
	// not clear-at-run-end.
	let approval: "none" | "armed" = "none";
	let armedUsedThisRun = false;
	// A Design Graph was presented at some point (incrementally scanned).
	let graphSeen = false;
	// Set by an explicit deny (dialog or /dt deny). Latches until a NEW graph
	// is presented — deny means stop asking.
	let graphDenied = false;
	// Dialog offers. Monotonic epoch; a decision applies only when its epoch
	// matches the live offer and the gate still allows arming.
	let nextEpoch = 1;
	let offer: Offer | undefined;
	// How many messages of the session have already been scanned for VERDICT.
	let scannedMessages = 0;

	// omp-only pi.logger surface; absent on pi 0.84.3.
	const logger = (pi as ExtensionAPI & { logger?: { warn?: (msg: string) => void } }).logger;

	// ── Transitions ─────────────────────────────────────────────────────────
	function setMode(on: boolean): void {
		mode = on ? "on" : "off";
		if (!on) {
			approval = "none";
			retractOffer();
		}
	}

	/** Arm the gate. Fails when the mode is off or an approval is already in
	 *  effect — the caller decides how to surface that. */
	function arm(): boolean {
		if (mode !== "on" || approval !== "none") return false;
		approval = "armed";
		retractOffer();
		return true;
	}

	/** Explicit revoke (/dt deny). Latches graph review until a new graph. */
	function revoke(): void {
		approval = "none";
		graphDenied = true;
		retractOffer();
	}

	function retractOffer(): void {
		offer?.abort.abort();
		offer = undefined;
	}

	/** May a dialog decision from `epoch` still be applied? */
	function decisionApplies(epoch: number): boolean {
		return offer?.epoch === epoch && mode === "on" && approval === "none";
	}

	// ── Session plumbing ────────────────────────────────────────────────────
	function applyStatus(ctx: ExtensionContext) {
		ctx.ui.setStatus("design-thinking", mode === "on" ? "design-thinking: on" : undefined);
	}

	function persist() {
		pi.appendEntry<DtState>(STATE_TYPE, { enabled: mode === "on" });
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
		if (restored !== undefined) setMode(restored);
	}

	pi.on("session_start", async (_event, ctx) => {
		restore(ctx);
		applyStatus(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus("design-thinking", undefined);
	});

	// ── /dt command ─────────────────────────────────────────────────────────
	pi.registerCommand("dt", {
		description: "Design Thinking mode: /dt toggles, on|off|status set/query, approve asks then implements, deny re-locks; anything else runs as a prompt with mode on",
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim();
			const lower = arg.toLowerCase();

			if (lower === "status") {
				ctx.ui.notify(`Design Thinking mode: ${mode === "on" ? "on" : "off"}${approval === "armed" ? " (file edits armed for the next run)" : ""}`, "info");
				return;
			}

			if (lower === "approve") {
				if (mode !== "on") {
					ctx.ui.notify("Design Thinking is OFF — nothing to approve. Run /dt on first.", "info");
					return;
				}
				// Direct arm: the interactive approve/refine/deny dialog opens
				// automatically after a gated run ends; this command is the
				// headless/scripting path, so no nested dialog here.
				if (!arm()) {
					ctx.ui.notify("Design Thinking: file edits are already armed", "info");
					return;
				}
				ctx.ui.notify("Design Thinking: file edits armed (this run) — implementing the approved design without re-presenting the graph", "info");
				// Arming alone leaves the session idle: the agent never learns approval
				// happened and the user sees "nothing happened". Send the go-ahead so
				// the armed run starts now (steer if mid-run).
				await pi.sendUserMessage(GO_AHEAD_MESSAGE, { deliverAs: "steer" });
				return;
			}
			if (lower === "deny") {
				if (approval !== "armed") {
					ctx.ui.notify("Design Thinking: no approval in effect — file edits are already blocked", "info");
					return;
				}
				revoke();
				ctx.ui.notify("Design Thinking: file edits blocked again", "info");
				return;
			}
			// "on"/"off" set explicitly; anything else is a prompt to run in this
			// mode and always turns the mode ON (never toggles it off); bare /dt toggles.
			const prompt = /^(on|off|status)$/.test(lower) ? "" : arg;
			const on = lower === "on" || prompt ? true : lower === "off" ? false : mode === "off";
			setMode(on);
			persist();
			applyStatus(ctx);
			ctx.ui.notify(
				on
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

	// ── Run hooks ───────────────────────────────────────────────────────────
	// While active, append the distilled block to the system prompt every run.
	pi.on("before_agent_start", async (event) => {
		armedUsedThisRun = false;
		if (mode !== "on") return undefined;
		return {
			systemPrompt: event.systemPrompt + "\n\n" + DISTILLED + "\n",
		};
	});

	// Mechanical backstop: while armed, mutating tools pass (and mark the arm
	// as used); otherwise they are blocked with instructions to present the
	// graph and end the turn.
	pi.on("tool_call", async (event) => {
		if (mode !== "on") return undefined;
		if (!MUTATING_TOOLS[event.toolName]) return undefined;
		if (approval === "armed") {
			armedUsedThisRun = true;
			return undefined;
		}
		return { block: true, reason: GATE_REASON };
	});

	// Run-end housekeeping: consume a used arm; offer the review dialog when a
	// graph is on the table and the user has not denied it.
	pi.on("agent_end", async (event, ctx) => {
		// Keep the scan cursor in sync even while off, so re-enabling does not
		// rescan or mis-slice history.
		const messages = event.messages;
		if (mode !== "on") {
			scannedMessages = messages.length;
			return;
		}

		// Incremental VERDICT scan — only messages since the last run end.
		// A long session never re-scans old history.
		const fresh = messages.slice(Math.min(scannedMessages, messages.length));
		scannedMessages = messages.length;
		if (fresh.some(presentsGraph)) {
			graphSeen = true;
			graphDenied = false;
		}

		if (approval === "armed") {
			if (armedUsedThisRun) approval = "none"; // consumed
			retractOffer();
			return;
		}

		if (!graphSeen || graphDenied) return;
		if (offer) return; // a dialog is already live
		if (!ctx.hasUI) {
			ctx.ui.notify("Design Thinking: review the presented design, then run /dt approve or /dt deny", "info");
			return;
		}
		offerReview(ctx);
	});

	// ── Review dialog ───────────────────────────────────────────────────────
	// One dialog per offer. Extension-owned AbortSignal: omp dismisses
	// handler-opened dialogs when the handler's 30s budget expires, and a
	// detached promise does not escape that binding — the signal replaces it.
	// If the dialog is dismissed anyway (runtime kill, or the agent's own
	// dialog displacing it), the offer is retracted; the next run end makes a
	// fresh offer. A dismissed dialog is NOT a deny.
	function offerReview(ctx: ExtensionContext): void {
		const epoch = nextEpoch++;
		const abort = new AbortController();
		offer = { epoch, abort };

		void (async () => {
			const choice = await ctx.ui.select("Review the presented design", [...REVIEW_OPTIONS], {
				signal: abort.signal,
			});
			if (!decisionApplies(epoch)) return; // superseded; discard silently

			if (choice === undefined) {
				// Dismissed, not decided. File edits stay blocked; a fresh offer
				// opens at the next run end.
				retractOffer();
				return;
			}
			if (choice.startsWith("Deny")) {
				graphDenied = true;
				retractOffer();
				ctx.ui.notify("Design Thinking: file edits blocked — nothing approved", "info");
				return;
			}
			if (choice.startsWith("Approve")) {
				if (!arm()) return; // gate changed while the human was deciding
				ctx.ui.notify("Design Thinking: file edits armed — implementing the approved design", "info");
				await pi.sendUserMessage(GO_AHEAD_MESSAGE, { deliverAs: "steer" });
				return;
			}
			// Refine: collect feedback and send it back; the dialog re-opens
			// after the refined plan is presented.
			const feedback = await ctx.ui.input(
				"What should change in the design?",
				"e.g. too complex — drop the cache layer",
				{ signal: abort.signal },
			);
			if (!decisionApplies(epoch)) return;
			if (feedback === undefined || !feedback.trim()) {
				retractOffer();
				return;
			}
			retractOffer();
			await pi.sendUserMessage(
				`Refine the presented design (do not implement yet): ${feedback.trim()}\n\n(Design Thinking: update the Design Graph (Graph Protocol) per this feedback and present it again. File edits stay blocked.)`,
				{ deliverAs: "steer" },
			);
		})().catch((err: unknown) => {
			if (offer?.epoch === epoch) retractOffer();
			logger?.warn?.(`design-thinking: review dialog failed: ${String(err)}`);
		});
	}
}
