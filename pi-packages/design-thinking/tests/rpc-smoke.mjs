#!/usr/bin/env node
/**
 * Live RPC smoke test — drives a REAL `pi` or `omp` process over its RPC
 * protocol to confirm the mutation gate against the real agent loop, not
 * the hand-mocked harness in gate.test.ts.
 *
 * COSTS REAL API SPEND (one real model turn, a few cents with a cheap
 * model). Never run this under `bun test` or in CI — it is a manual
 * diagnostic, run by a human on purpose. Prints the observed cost at the
 * end so you know what it spent.
 *
 * Run:
 *   node tests/rpc-smoke.mjs --harness omp
 *   node tests/rpc-smoke.mjs --harness pi [--model haiku] [--timeout 90000]
 *
 * What it checks: with /dt on and unapproved, a direct `write` tool call
 * must be blocked before execution (tool_execution_end isError:true, text
 * matching the gate's GATE_REASON) and must leave no file behind. That is
 * the one hard pass/fail assertion. If the model also renders a full
 * Design Graph and the review dialog surfaces (extension_ui_request,
 * method "select"), this script Approves it and logs what happened next,
 * but does NOT fail the run if the dialog never appears — a cheap model at
 * default thinking level does not reliably render a full canonical-header
 * graph every time (observed live, see docs/plans/2026-10-07-design-
 * thinking-full-review.md §3). Checked against the GATE_REASON's stable
 * prefix text, not an exact import of the extension's private constant —
 * it isn't exported, and coupling a test script to a private module
 * constant isn't worth it for one string.
 *
 * Harness differences (both confirmed via --help, see the 2026-10-08 plan):
 *   omp: --mode rpc-ui --no-session --cwd <dir>   (rpc alone swallows the
 *        dialog's extension_ui_request; --no-ui swallows it too — rpc-ui
 *        is the only mode that surfaces it)
 *   pi:  --mode rpc --no-session, cwd via spawn() options (pi has no
 *        --cwd flag and no rpc-ui/--no-ui split to begin with)
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE_REASON_PREFIX = "Design Thinking mode is ON:";

function parseArgs(argv) {
	const out = {
		// Bare "haiku" fuzzy-matches ambiguously on pi (resolved to an
		// unconfigured amazon-bedrock credential there, even though
		// `--list-models haiku` only lists openrouter candidates) — pin the
		// provider explicitly so the default works the same on both harnesses.
		model: "openrouter/anthropic/claude-haiku-4.5",
		timeout: 90000,
		ext: path.join(HERE, "..", "extensions", "design-thinking.ts"),
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--harness") out.harness = argv[++i];
		else if (a === "--model") out.model = argv[++i];
		else if (a === "--ext") out.ext = path.resolve(argv[++i]);
		else if (a === "--timeout") out.timeout = Number(argv[++i]);
	}
	if (out.harness !== "pi" && out.harness !== "omp") {
		console.error("usage: rpc-smoke.mjs --harness <pi|omp> [--model <pattern>] [--ext <path>] [--timeout <ms>]");
		process.exit(2);
	}
	return out;
}

function buildSpawn(opts, cwd) {
	if (opts.harness === "omp") {
		const args = ["-e", opts.ext, "--mode", "rpc-ui", "--no-session", "--cwd", cwd];
		if (opts.model) args.push("--model", opts.model);
		return { bin: "omp", args, spawnOpts: {} };
	}
	const args = ["-e", opts.ext, "--mode", "rpc", "--no-session"];
	if (opts.model) args.push("--model", opts.model);
	return { bin: "pi", args, spawnOpts: { cwd } };
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const scratchCwd = mkdtempSync(path.join(tmpdir(), `dt-rpc-${opts.harness}-`));
	const { bin, args, spawnOpts } = buildSpawn(opts, scratchCwd);

	console.log(`[rpc-smoke] harness=${opts.harness} model=${opts.model} cwd=${scratchCwd}`);
	console.log(`[rpc-smoke] spawning: ${bin} ${args.join(" ")}`);

	const child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"], ...spawnOpts });

	let buf = "";
	let pendingUiRequestId = null;
	let approveSent = false;
	let writeBlocked = false;
	let writeUnexpectedlySucceeded = false;
	let dialogObserved = false;
	let totalCost = 0;
	const log = [];

	function send(obj) {
		log.push({ dir: ">>>", data: obj });
		child.stdin.write(JSON.stringify(obj) + "\n");
	}

	child.stdout.on("data", (chunk) => {
		buf += chunk.toString("utf8");
		let idx;
		while ((idx = buf.indexOf("\n")) >= 0) {
			const line = buf.slice(0, idx);
			buf = buf.slice(idx + 1);
			if (!line.trim()) continue;
			let obj;
			try {
				obj = JSON.parse(line);
			} catch {
				continue;
			}
			log.push({ dir: "<<<", data: obj });

			if (obj.type === "extension_ui_request" && obj.method === "select") {
				pendingUiRequestId = obj.id;
				dialogObserved = true;
			}
			if (obj.type === "tool_execution_end" && obj.toolName === "write") {
				const text = (obj.result?.content || []).map((c) => c.text || "").join("");
				if (obj.isError && text.startsWith(GATE_REASON_PREFIX)) writeBlocked = true;
				else if (!obj.isError) writeUnexpectedlySucceeded = true;
			}
			const usage = obj.message?.usage ?? obj.assistantMessageEvent?.partial?.usage;
			if (usage?.cost?.total) totalCost += usage.cost.total;
		}
	});

	child.stderr.on("data", (c) => log.push({ dir: "!!!", data: c.toString("utf8") }));

	await sleep(1500);
	send({ type: "prompt", message: "/dt on" });
	await sleep(3000);
	send({
		type: "prompt",
		message:
			"Immediately use your write tool to create a file named probe.txt containing the text hello — no planning, no questions, just call the write tool right now.",
	});

	const deadline = Date.now() + opts.timeout;
	while (Date.now() < deadline && !writeBlocked && !writeUnexpectedlySucceeded) {
		if (pendingUiRequestId && !approveSent) {
			approveSent = true;
			send({ type: "extension_ui_response", id: pendingUiRequestId, value: "Approve — implement now" });
		}
		await sleep(500);
	}
	// Give any trailing dialog a moment to show up even after the block lands.
	await sleep(3000);
	if (pendingUiRequestId && !approveSent) {
		approveSent = true;
		send({ type: "extension_ui_response", id: pendingUiRequestId, value: "Approve — implement now" });
		await sleep(1500);
	}

	send({ type: "abort" });
	await sleep(500);
	child.stdin.end();
	child.kill("SIGTERM");
	await sleep(300);
	try {
		child.kill("SIGKILL");
	} catch {}

	const leftoverFiles = readdirSync(scratchCwd);
	rmSync(scratchCwd, { recursive: true, force: true });

	console.log("");
	console.log(`[rpc-smoke] writeBlocked=${writeBlocked} dialogObserved=${dialogObserved} approveSent=${approveSent}`);
	console.log(`[rpc-smoke] leftover files in scratch cwd: ${JSON.stringify(leftoverFiles)}`);
	console.log(`[rpc-smoke] observed cost: $${totalCost.toFixed(4)}`);

	const fail = [];
	if (!writeBlocked) fail.push("direct write was never observed to be blocked with the gate's GATE_REASON");
	if (writeUnexpectedlySucceeded) fail.push("a write succeeded before any approval — GATE BYPASS");
	if (leftoverFiles.length > 0) fail.push(`scratch cwd has files it shouldn't: ${leftoverFiles.join(", ")}`);

	if (fail.length) {
		console.error(`\nFAIL (${opts.harness}): ${fail.join("; ")}`);
		process.exitCode = 1;
	} else {
		console.log(`\nPASS (${opts.harness}): unapproved write was blocked and no file was written.`);
		if (!dialogObserved) {
			console.log(
				"NOTE: the review dialog never surfaced this run (model didn't render a full graph) — not a failure, see header comment.",
			);
		}
	}
}

main();
