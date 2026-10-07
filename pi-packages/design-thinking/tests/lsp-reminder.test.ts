/**
 * Behavioral tests for the always-on LSP reminder inside the design-thinking
 * extension.
 *
 * Contract:
 *   - `lsp` tool present → LSP reminder composes into EVERY run's prompt,
 *     regardless of /dt mode; no suggestion is emitted.
 *   - mode "on" composes DISTILLED on top; mode "off" injects the reminder
 *     alone (LSP discipline is mode-independent).
 *   - `lsp` tool absent → no injection; ONE suggestion per session
 *     (harness-aware text); a new session (session_start) resets the flag.
 *   - Missing/throwing getAllTools degrades to "not capable", silently.
 */
import { describe, expect, test } from "bun:test";

import designThinkingExtension from "../extensions/design-thinking.ts";

type Handler = (event: unknown, ctx: unknown) => Promise<unknown>;

interface Harness {
	fire(event: string, eventArg: unknown): Promise<unknown>;
	command(args: string): Promise<void>;
	start(): Promise<void>;
	notes: string[];
}

const RUN = { systemPrompt: "base" };

function makeHarness(
	opts?: { tools?: Array<{ name?: string }>; omp?: boolean; hasUI?: boolean; throwOnProbe?: boolean },
): Harness {
	const handlers: Record<string, Handler> = {};
	let commandHandler: Handler | undefined;
	const notes: string[] = [];

	const pi: Record<string, unknown> = {
		on: (event: string, handler: Handler) => {
			handlers[event] = handler;
		},
		registerCommand: (_name: string, def: { handler: Handler }) => {
			commandHandler = def.handler;
		},
		appendEntry: () => {},
		sendUserMessage: async () => {},
	};
	if (opts?.throwOnProbe) {
		pi.getAllTools = () => {
			throw new Error("registry not ready");
		};
	} else if (opts?.tools !== undefined) {
		pi.getAllTools = () => opts.tools;
	}
	if (opts?.omp !== false) pi.logger = {}; // omp marker

	designThinkingExtension(pi as unknown as Parameters<typeof designThinkingExtension>[0]);

	const ctx = {
		hasUI: opts?.hasUI !== false,
		ui: {
			notify: (msg: string) => notes.push(msg),
			setStatus: () => {},
		},
		sessionManager: { getBranch: (): unknown[] => [] },
	};
	return {
		fire: async (event: string, eventArg: unknown) => handlers[event]?.(eventArg, ctx),
		command: async (args: string) => commandHandler?.(args, ctx),
		start: async () => handlers.session_start?.({}, ctx),
		notes,
	};
}

describe("design-thinking lsp reminder", () => {
	test("capable + mode on → DISTILLED and LSP FIRST compose", async () => {
		const h = makeHarness({ tools: [{ name: "read" }, { name: "lsp" }] });
		await h.start();
		await h.command("on");
		const r = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r.systemPrompt).toContain("DESIGN THINKING MODE");
		expect(h.notes.some((n) => n.startsWith("LSP Reminder"))).toBe(false);
	});

	test("capable + mode off → LSP reminder alone", async () => {
		const h = makeHarness({ tools: [{ name: "lsp" }] });
		await h.start(); // mode stays off
		const r = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r.systemPrompt.startsWith("base")).toBe(true);
		expect(r.systemPrompt).toContain("LSP FIRST");
		expect(r.systemPrompt).not.toContain("DESIGN THINKING MODE");
	});

	test("incapable omp → one suggestion, no injection, DISTILLED unaffected", async () => {
		const h = makeHarness({ tools: [{ name: "read" }] });
		await h.start();
		const lspSuggestedCount = h.notes.filter((n) => n.startsWith("LSP Reminder")).length;
		expect(lspSuggestedCount).toBe(1);
		expect(h.notes[0]).toContain("no `lsp` tool");
		await h.command("on");
		const r = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r.systemPrompt).toContain("DESIGN THINKING MODE");
		expect(r.systemPrompt).not.toContain("LSP FIRST");
		// Suggestion does not repeat per run.
		await h.fire("before_agent_start", RUN);
		expect(h.notes.filter((n) => n.startsWith("LSP Reminder")).length).toBe(1);
	});

	test("pi-shaped session (no logger) → pi text", async () => {
		const h = makeHarness({ tools: [{ name: "read" }], omp: false });
		await h.start();
		expect(h.notes).toHaveLength(1);
		expect(h.notes[0]).toContain("pi has no LSP");
	});

	test("probe without session_start still injects, never suggests", async () => {
		const h = makeHarness({ tools: [{ name: "lsp" }] });
		await h.command("on"); // no session_start fired
		const r = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r.systemPrompt).toContain("LSP FIRST");
		expect(h.notes.some((n) => n.startsWith("LSP Reminder"))).toBe(false);
	});

	test("session_start resets the suggestion flag", async () => {
		const h = makeHarness({ tools: [] });
		await h.start();
		expect(h.notes).toHaveLength(1);
		await h.start();
		expect(h.notes).toHaveLength(2);
	});

	test("throwing getAllTools degrades to not-capable", async () => {
		const h = makeHarness({ throwOnProbe: true });
		await h.start();
		expect(h.notes).toHaveLength(1);
		expect(await h.fire("before_agent_start", RUN)).toBeUndefined();
	});
});