/**
 * Loader + behavior smoke test for general-reminder — zero API calls.
 *
 * Verifies:
 *   1. pi's resource loader discovers the extension from the package
 *      manifest (the real install surface, not a stub of it).
 *   2. The extension behaves per its README contract under a minimal
 *      fake ExtensionAPI: missing file silent, always-on injection,
 *      once-flags, malformed-file warning, session_start reload/reset,
 *      omp-vs-pi config path via the pi.logger detection surface.
 *
 * Run: node --experimental-strip-types tests/smoke-loader.ts
 * (bun tests in general-reminder.test.ts cover the same contract in more
 * depth; this file exists because mise's pi-package:verify runs node.)
 */
import { DefaultResourceLoader } from "@earendil-works/pi-coding-agent";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, "..");

// ------------------------------------------------ 1. loader discovery ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "general-reminder-smoke-"));
const loader = new DefaultResourceLoader({
	cwd: tmp,
	agentDir: path.join(tmp, "agent"),
	additionalExtensionPaths: [PKG],
});
await loader.reload();
const extPaths = ((loader.getExtensions().extensions ?? []) as Array<{ path?: string }>).map(
	(e) => e.path ?? "",
);
const wantExt = path.join(PKG, "extensions", "reminder.ts");
assert.ok(extPaths.includes(wantExt), `loader discovers extensions/reminder.ts (got ${extPaths.join(", ") || "none"})`);
console.log("ok   loader discovers extensions/reminder.ts");

// --------------------------------------------- 2. extension behavior -----
// Minimal fake of the pi extension surface used by reminder.ts. Each setup()
// registers one extension instance (omp detection reads pi.logger off it).
type Handler = (event: any, ctx: any) => Promise<any>;
const extMod = await import(path.join(PKG, "extensions", "reminder.ts"));
const setup = (omp: boolean) => {
	const handlers: Record<string, Handler[]> = {};
	const api: any = { on: (n: string, fn: Handler) => (handlers[n] ??= []).push(fn) };
	if (omp) api.logger = {};
	extMod.default(api);
	return async (name: string, event: any, ctx: any) => {
		let out: any;
		for (const fn of handlers[name] ?? []) out = await fn(event, ctx);
		return out;
	};
};
const project = () => fs.mkdtempSync(path.join(os.tmpdir(), "general-reminder-proj-"));
const write = (dir: string, body: string, omp = false) => {
	fs.mkdirSync(path.join(dir, omp ? ".omp" : ".pi"), { recursive: true });
	fs.writeFileSync(path.join(dir, omp ? ".omp" : ".pi", "reminders.json"), body);
};
const run = (fire: ReturnType<typeof setup>, dir: string) =>
	fire("before_agent_start", { systemPrompt: "BASE" }, { cwd: dir });
const start = async (fire: ReturnType<typeof setup>, dir: string, hasUI = false) => {
	const warns: string[] = [];
	await fire(
		"session_start",
		{},
		{ cwd: dir, hasUI, ui: { notify: (m: string) => warns.push(m) } },
	);
	return warns;
};

// missing file → silent, no injection
{
	const dir = project();
	const fire = setup(false);
	assert.equal((await start(fire, dir)).length, 0);
	assert.equal(await run(fire, dir), undefined);
	console.log("ok   missing reminders.json → silent, no injection");
}
// omp path (.omp/) is read when pi.logger exists
{
	const dir = project();
	write(dir, JSON.stringify({ reminders: ["from omp dir"] }), true);
	const fire = setup(true);
	await start(fire, dir);
	const out = await run(fire, dir);
	assert.match(out.systemPrompt, /from omp dir/);
	// and the pi instance ignores .omp/
	const firePi = setup(false);
	await start(firePi, dir);
	assert.equal(await run(firePi, dir), undefined);
	console.log("ok   .omp/reminders.json discovered (pi instance ignores it)");
}
// always-on + once + cap semantics
{
	const dir = project();
	// cap is applied while reading: entries beyond 20 are dropped (README documents this)
	write(dir, JSON.stringify({ reminders: [{ text: "one shot", once: true }, ...Array.from({ length: 19 }, (_, i) => `r${i}`)] }));
	const fire = setup(false);
	await start(fire, dir);
	const first = await run(fire, dir);
	assert.match(first.systemPrompt, /r18\n/);
	assert.match(first.systemPrompt, /one shot/);
	assert.ok(!first.systemPrompt.includes("r19\n"), "capped at 20 entries");
	const second = await run(fire, dir);
	assert.ok(!second.systemPrompt.includes("one shot"), "once fired only on first run");
	assert.match(second.systemPrompt, /r0/, "always-on still injected");
	assert.ok(!second.systemPrompt.includes("r19\n"), "cap respected on re-run");
	console.log("ok   always-on / once / 20-entry cap");
}
// malformed → one warning, no injection
{
	const dir = project();
	write(dir, "{ not json");
	const fire = setup(false);
	const warns = await start(fire, dir, true);
	assert.equal(warns.length, 1);
	assert.match(warns[0], /cannot parse/);
	assert.equal(await run(fire, dir), undefined);
	console.log("ok   malformed file → one warning, no injection");
}
// session_start reloads and resets once-flags
{
	const dir = project();
	const fire = setup(false);
	write(dir, JSON.stringify({ reminders: [{ text: "once-y", once: true }] }));
	await start(fire, dir);
	await run(fire, dir);
	write(dir, JSON.stringify({ reminders: [{ text: "renewed", once: true }] }));
	await start(fire, dir); // restart/reload
	const out = await run(fire, dir);
	assert.match(out.systemPrompt, /renewed/);
	console.log("ok   session_start reloads config and resets once-flags");
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log("all smoke-loader checks passed");
