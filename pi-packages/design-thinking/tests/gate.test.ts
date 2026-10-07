/**
 * Behavioral tests for the design-thinking approval gate state machine.
 * Drives the real extension factory with a scripted pi/ctx mock.
 * Run: bun test tests/gate.test.ts
 *
 * Dialog timing model: `fire("agent_end", ...)` opens a dialog that stays
 * PENDING until the test resolves it via answerSelect(...) — matching real
 * timing, where a human answers after the run ends.
 *
 * Approval is scoped to ONE human turn: it survives the many runs of
 * implementing an approved design, and re-locks when a genuine user `input`
 * arrives (not the extension's own go-ahead / refine messages).
 */
import { describe, expect, test } from "bun:test";

import designThinkingExtension from "../extensions/design-thinking.ts";

type Handler = (event: unknown, ctx: unknown) => Promise<unknown>;

interface UiMock {
	select(title: string, options: string[], opts?: { signal?: AbortSignal }): Promise<string | undefined>;
	input(title: string, placeholder?: string, opts?: { signal?: AbortSignal }): Promise<string | undefined>;
	notify(msg: string): void;
	setStatus(key: string, value: string | undefined): void;
}

interface PiMock {
	on(event: string, handler: Handler): void;
	registerCommand(name: string, def: { handler: Handler }): void;
	appendEntry(type: string, data: unknown): void;
	sendUserMessage(msg: string, opts: { deliverAs: string }): Promise<void>;
}

interface Harness {
	ctx: unknown;
	command(args: string): Promise<void>;
	fire(event: string, eventArg: unknown): Promise<unknown>;
	/** Simulate a user prompt reaching the agent. */
	userInput(text: string, source?: "interactive" | "rpc" | "extension"): Promise<unknown>;
	/** Resolve the oldest pending review dialog with a choice. */
	answerSelect(choice: string | undefined): void;
	/** How many dialogs are open and unanswered. */
	pendingDialogs(): number;
	sent: string[];
	notes: string[];
}

/** Microtask flush: settles detached dialog promises deterministically,
 *  with no wall-clock timers. */
async function flush(): Promise<void> {
	for (let i = 0; i < 25; i++) await Promise.resolve();
}

function makeHarness(): Harness {
	const handlers: Record<string, Handler> = {};
	let commandHandler: Handler | undefined;
	const sent: string[] = [];
	const notes: string[] = [];
	const pending: PromiseWithResolvers<string | undefined>[] = [];

	const ui: UiMock = {
		select: async () => {
			const p = Promise.withResolvers<string | undefined>();
			pending.push(p);
			return p.promise;
		},
		input: async () => undefined,
		notify: (msg: string) => notes.push(msg),
		setStatus: () => {},
	};

	const ctx = {
		ui,
		hasUI: true,
		sessionManager: { getBranch: (): unknown[] => [] },
	};

	const pi: PiMock = {
		on: (event, handler) => {
			handlers[event] = handler;
		},
		registerCommand: (_name, def) => {
			commandHandler = def.handler;
		},
		appendEntry: () => {},
		sendUserMessage: async (msg) => {
			sent.push(msg);
		},
	};

	designThinkingExtension(pi as unknown as Parameters<typeof designThinkingExtension>[0]);

	return {
		ctx,
		command: async (args: string) => {
			await commandHandler?.(args, ctx);
		},
		fire: async (event: string, eventArg: unknown) => {
			return await handlers[event]?.(eventArg, ctx);
		},
		userInput: async (text: string, source = "interactive" as const) =>
			await handlers.input?.({ type: "input", text, source }, ctx),
		answerSelect: (choice) => pending.shift()?.resolve(choice),
		pendingDialogs: () => pending.length,
		sent,
		notes,
	};
}

interface Message {
	role: string;
	content?: string;
}

/** An assistant message rendering a full Design Graph (VERDICT + sections). */
const GRAPH_MESSAGE: Message = {
	role: "assistant",
	content: [
		"## PROBLEM",
		"rate-limit the API.",
		"## GRAPH",
		"req -> limiter -> handler",
		"## BOUNDARIES",
		"parse at the edge.",
		"## VERDICT",
		"Ship it.",
	].join("\n"),
};

/** An agent_end event whose messages end with a presented graph. */
function runEndWithGraph(runLength: number): { messages: Message[] } {
	const messages: Message[] = Array.from({ length: runLength }, () => ({
		role: "user",
		content: "x",
	}));
	messages.push({ ...GRAPH_MESSAGE });
	return { messages };
}

/** An agent_end whose last assistant message is a prose approval ask, no graph. */
function runEndWithProseAsk(): { messages: Message[] } {
	return {
		messages: [
			{ role: "user", content: "add the feature" },
			{ role: "assistant", content: "Here is the plan. Approve and I'll write both files." },
		],
	};
}

function isBlocked(result: unknown): boolean {
	return (
		typeof result === "object" &&
		result !== null &&
		"block" in result &&
		(result as { block: unknown }).block === true
	);
}

async function startGatedSession(h: Harness): Promise<void> {
	await h.command("on");
	// before_agent_start injects the distilled prompt.
	await h.fire("before_agent_start", { systemPrompt: "base" });
}

describe("design-thinking gate", () => {
	test("graph + approve arms; approval persists across run ends within a turn", async () => {
		const h = makeHarness();
		await startGatedSession(h);

		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);

		await h.fire("agent_end", runEndWithGraph(1));
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect("Approve — implement now");
		await flush();

		expect(await h.fire("tool_call", { toolName: "edit" })).toBeUndefined();

		// Approval is NOT consumed by run ends — implementation spans runs.
		await h.fire("agent_end", { messages: [] });
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
		// The go-ahead reached the agent exactly once.
		expect(h.sent.filter((m) => m.startsWith("Approved — implement")).length).toBe(1);
	});

	test("a new user instruction re-locks: edits blocked until re-approved", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();

		// User speaks again → new design decision → re-lock.
		await h.userInput("also add a per-IP cap");
		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);
		// A run that ends with no graph and no ask offers nothing.
		await h.fire("agent_end", { messages: [] });
		expect(h.pendingDialogs()).toBe(0);

		// Agent re-presents the (refined) graph → dialog re-opens.
		await h.fire("agent_end", runEndWithGraph(1));
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("extension-sourced input (go-ahead / refine) does NOT re-lock", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		h.answerSelect("Approve — implement now");
		await flush();

		await h.userInput("Approved — implement the presented design now.", "extension");
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("/dt <prompt> re-locks even though it delivers via sendUserMessage", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();

		await h.command("now refactor the parser");
		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);
	});

	test("multi-marker detection: a bare 'verdict' in prose does not open the dialog", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", {
			messages: [{ role: "assistant", content: "My verdict: this looks tricky. Let me dig in." }],
		});
		expect(h.pendingDialogs()).toBe(0);
	});

	test("prose approval ask with no graph still opens the dialog (no button-less ask)", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithProseAsk());
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("a blocked mutation never opens the dialog mid-run; the UI waits for run end", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		// Graph presented, dialog dismissed (NOT denied) — gate stays locked and
		// the graph stays with the current cycle.
		await h.fire("agent_end", runEndWithGraph(1));
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect(undefined); // dismissed, not a deny
		await flush();

		// Next run the agent re-attempts mutations without re-presenting the
		// graph. All channels block — and the review UI must NOT open while the
		// agent is still streaming.
		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);
		expect(isBlocked(await h.fire("tool_call", { toolName: "bash" }))).toBe(true);
		expect(h.pendingDialogs()).toBe(0);

		// The dialog opens only when the run ends (the agent has stopped).
		await h.fire("agent_end", runEndWithGraph(3));
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("shell and code-execution channels are gated like file edits (pi + omp)", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		// Pre-approval: every mutation channel blocks; read-only tools pass.
		expect(isBlocked(await h.fire("tool_call", { toolName: "bash" }))).toBe(true);
		expect(isBlocked(await h.fire("tool_call", { toolName: "eval" }))).toBe(true);
		expect(isBlocked(await h.fire("tool_call", { toolName: "powershell" }))).toBe(true);
		expect(await h.fire("tool_call", { toolName: "read" })).toBeUndefined();
		expect(await h.fire("tool_call", { toolName: "grep" })).toBeUndefined();
		expect(await h.fire("tool_call", { toolName: "glob" })).toBeUndefined();

		// Approve → the whole gate opens, shells included.
		await h.fire("agent_end", runEndWithGraph(1));
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "bash" })).toBeUndefined();
		expect(await h.fire("tool_call", { toolName: "eval" })).toBeUndefined();

		// A new user instruction re-locks every channel.
		await h.userInput("tighten the boundaries section");
		expect(isBlocked(await h.fire("tool_call", { toolName: "bash" }))).toBe(true);
		expect(isBlocked(await h.fire("tool_call", { toolName: "edit" }))).toBe(true);
	});

	test("explicit deny latches: no re-offer until a NEW graph is presented", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		h.answerSelect("Deny — keep file edits blocked");
		await flush();
		expect(h.notes.some((n) => n.includes("nothing approved"))).toBe(true);

		// Run end with no new graph → latch holds, no dialog offered.
		await h.fire("agent_end", { messages: [] });
		expect(h.pendingDialogs()).toBe(0);
		expect(h.sent.length).toBe(0);
		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);

		// A NEW graph re-arms the offer.
		await h.fire("agent_end", runEndWithGraph(1));
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("stale dialog decision is discarded: /dt approve while dialog open wins", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		expect(h.pendingDialogs()).toBe(1);

		// The user runs /dt approve while the dialog is still open.
		await h.command("approve");
		// The dialog's late Approve arrives afterwards and must be discarded.
		h.answerSelect("Approve — implement now");
		await flush();

		// Exactly one go-ahead (from the command), not two.
		expect(h.sent.filter((m) => m.startsWith("Approved — implement")).length).toBe(1);
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("arm survives an idle command run and applies to the next real run", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		h.answerSelect("Deny — keep file edits blocked");
		await flush();

		await h.command("approve");
		// The /dt approve command itself ends a run that made no edits.
		await h.fire("agent_end", { messages: [] });
		// Still armed for the NEXT run.
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("mode off invalidates everything: late dialog decision cannot unlock", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		await h.command("off"); // dialog still open, decision will arrive later
		h.answerSelect("Approve — implement now");
		await flush();
		expect(h.sent.filter((m) => m.startsWith("Approved — implement")).length).toBe(0);

		// Re-enabling does not inherit the old arm.
		await h.command("on");
		await h.fire("before_agent_start", { systemPrompt: "base" });
		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);
		// And no stale graph carries over: a bare run end offers nothing.
		await h.fire("agent_end", { messages: [] });
		expect(h.pendingDialogs()).toBe(0);
	});

	test("/dt deny revokes only an active arm and latches", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.command("deny"); // nothing armed yet
		expect(h.notes.some((n) => n.includes("already blocked"))).toBe(true);

		await h.command("approve");
		await h.command("deny");
		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);
	});
});
