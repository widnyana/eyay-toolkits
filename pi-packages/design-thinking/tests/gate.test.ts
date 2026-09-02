/**
 * Behavioral tests for the design-thinking approval gate state machine.
 * Drives the real extension factory with a scripted pi/ctx mock.
 * Run: bun test tests/gate.test.ts
 *
 * Dialog timing model: `fire("agent_end", ...)` opens a dialog that stays
 * PENDING until the test resolves it via answerSelect(...) — matching real
 * timing, where a human answers after the run ends.
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

/** An agent_end event whose messages end with a presented graph. */
function runEndWithGraph(runLength: number): { messages: Message[] } {
	const messages: Message[] = Array.from({ length: runLength }, () => ({
		role: "user",
		content: "x",
	}));
	messages.push({ role: "assistant", content: "## VERDICT\nShip it." });
	return { messages };
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
	// before_agent_start injects the distilled prompt and resets run state.
	await h.fire("before_agent_start", { systemPrompt: "base" });
}

describe("design-thinking gate", () => {
	test("mutating tools blocked; graph + approve arms; armed run consumes at end", async () => {
		const h = makeHarness();
		await startGatedSession(h);

		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);

		await h.fire("agent_end", runEndWithGraph(1));
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect("Approve — implement now");
		await flush();

		expect(await h.fire("tool_call", { toolName: "edit" })).toBeUndefined();

		// Run ends having used the arm → approval consumed.
		await h.fire("agent_end", { messages: [] });
		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);
		// The go-ahead reached the agent exactly once.
		expect(h.sent.filter((m) => m.startsWith("Approved — implement")).length).toBe(1);
	});

	test("dismissed dialog is NOT a deny: gate stays locked, no 'nothing approved' notice, re-offer next run end", async () => {
		const h = makeHarness();
		await startGatedSession(h);
		await h.fire("agent_end", runEndWithGraph(1));
		h.answerSelect(undefined); // killed / displaced dialog
		await flush();

		expect(isBlocked(await h.fire("tool_call", { toolName: "write" }))).toBe(true);
		expect(h.notes.some((n) => n.includes("nothing approved"))).toBe(false);

		// Next run end re-offers: another dialog appears and can approve.
		await h.fire("agent_end", { messages: [] });
		expect(h.pendingDialogs()).toBe(1);
		h.answerSelect("Approve — implement now");
		await flush();
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
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
		// Approval survived the dialog's stale attempt.
		expect(await h.fire("tool_call", { toolName: "write" })).toBeUndefined();
	});

	test("arm survives an idle command run and applies to the next real run (round-1 trap)", async () => {
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
