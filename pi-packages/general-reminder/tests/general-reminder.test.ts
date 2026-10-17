/**
 * Behavioral tests for the general-reminder extension.
 *
 * Contract:
 *   - Config path is harness-dependent: omp reads <cwd>/.omp/reminders.json,
 *     pi reads <cwd>/.pi/reminders.json.
 *   - Bare strings are always-on; `once: true` fires on the first run only.
 *   - Missing file → silent, no injection. Malformed file → one warning,
 *     no injection. More than 20 entries → capped.
 *   - session_start reloads the config and resets once-flags.
 */
import { describe, expect, test } from "bun:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import generalReminderExtension from "../extensions/reminder.ts";

type Handler = (event: unknown, ctx: unknown) => Promise<unknown>;

interface Harness {
	fire(event: string, eventArg: unknown): Promise<unknown>;
	start(): Promise<void>;
	notes: string[];
	cwd: string;
}

function makeHarness(omp: boolean, cwd: string, hasUI = true): Harness {
	const handlers: Record<string, Handler> = {};
	const notes: string[] = [];
	const pi: Record<string, unknown> = {
		on: (event: string, handler: Handler) => {
			handlers[event] = handler;
		},
	};
	if (omp) pi.logger = {}; // omp marker

	generalReminderExtension(pi as unknown as Parameters<typeof generalReminderExtension>[0]);

	const ctx = { cwd, hasUI, ui: { notify: (msg: string) => notes.push(msg) } };
	return {
		fire: async (event: string, eventArg: unknown) => handlers[event]?.(eventArg, ctx),
		start: async () => handlers.session_start?.({}, ctx),
		notes,
		cwd,
	};
}

function writeConfig(cwd: string, omp: boolean, json: string): string {
	const dir = path.join(cwd, omp ? ".omp" : ".pi");
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, "reminders.json");
	fs.writeFileSync(file, json);
	return file;
}

function tmpProject(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "general-reminder-"));
}

const RUN = { systemPrompt: "base" };

describe("general-reminder", () => {
	test("omp reads .omp/reminders.json; bare strings repeat, once fires first run only", async () => {
		const cwd = tmpProject();
		fs.mkdirSync(path.join(cwd, ".omp"));
		fs.writeFileSync(
			path.join(cwd, ".omp", "reminders.json"),
			JSON.stringify({ reminders: ["Always run gofmt.", { text: "One-shot: check mise.toml.", once: true }] }),
		);
		const h = makeHarness(true, cwd);
		await h.start();
		expect(h.notes).toHaveLength(0);

		const r1 = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r1.systemPrompt).toContain("REMINDERS");
		expect(r1.systemPrompt).toContain("- Always run gofmt.");
		expect(r1.systemPrompt).toContain("One-shot: check mise.toml.");

		const r2 = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r2.systemPrompt).toContain("- Always run gofmt.");
		expect(r2.systemPrompt).not.toContain("One-shot: check mise.toml.");
	});

	test("pi reads .pi/reminders.json", async () => {
		const cwd = tmpProject();
		fs.mkdirSync(path.join(cwd, ".pi"));
		fs.writeFileSync(path.join(cwd, ".pi", "reminders.json"), JSON.stringify({ reminders: ["pi note"] }));
		const h = makeHarness(false, cwd); // no omp marker → .pi path
		await h.start();
		const r = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r.systemPrompt).toContain("- pi note");
	});

	test("missing config → silent, no injection", async () => {
		const cwd = tmpProject();
		const h = makeHarness(true, cwd);
		await h.start();
		expect(h.notes).toHaveLength(0);
		expect(await h.fire("before_agent_start", RUN)).toBeUndefined();
	});

	test("malformed JSON → one warning, no injection", async () => {
		const cwd = tmpProject();
		fs.mkdirSync(path.join(cwd, ".omp"));
		fs.writeFileSync(path.join(cwd, ".omp", "reminders.json"), "{ not json");
		const h = makeHarness(true, cwd);
		await h.start();
		expect(h.notes).toHaveLength(1);
		expect(h.notes[0]).toContain("cannot parse");
		expect(await h.fire("before_agent_start", RUN)).toBeUndefined();
	});

	test("more than 20 entries are capped", async () => {
		const cwd = tmpProject();
		fs.mkdirSync(path.join(cwd, ".omp"));
		fs.writeFileSync(
			path.join(cwd, ".omp", "reminders.json"),
			JSON.stringify({ reminders: Array.from({ length: 25 }, (_, i) => `note ${i + 1}`) }),
		);
		const h = makeHarness(true, cwd);
		await h.start();
		const r = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r.systemPrompt).toContain("- note 20");
		expect(r.systemPrompt).not.toContain("- note 21");
	});

	test("session_start reloads config and resets once-flags", async () => {
		const cwd = tmpProject();
		fs.mkdirSync(path.join(cwd, ".omp"));
		const file = path.join(cwd, ".omp", "reminders.json");
		fs.writeFileSync(file, JSON.stringify({ reminders: [{ text: "one shot", once: true }] }));
		const h = makeHarness(true, cwd);
		await h.start();
		expect((await h.fire("before_agent_start", RUN)) as { systemPrompt: string }).toBeTruthy();
		// Second run: once already fired.
		expect(await h.fire("before_agent_start", RUN)).toBeUndefined();

		// Config edited + a new session: reload, flag reset, injected again.
		fs.writeFileSync(file, JSON.stringify({ reminders: [{ text: "one shot", once: true }] }));
		await h.start();
		const r = (await h.fire("before_agent_start", RUN)) as { systemPrompt: string };
		expect(r.systemPrompt).toContain("- one shot");
	});

	test("headless sessions stay silent on parse errors", async () => {
		const cwd = tmpProject();
		fs.mkdirSync(path.join(cwd, ".omp"));
		fs.writeFileSync(path.join(cwd, ".omp", "reminders.json"), "not json");
		const h = makeHarness(true, cwd, false);
		await h.start();
		expect(h.notes).toHaveLength(0);
		expect(await h.fire("before_agent_start", RUN)).toBeUndefined();
	});
});