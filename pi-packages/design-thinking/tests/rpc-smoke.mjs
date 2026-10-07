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
 * Run (PREFERRED_MODEL in .env, or --model, sets the model; never hardcode
 * one here):
 *   node tests/rpc-smoke.mjs --harness omp
 *   node tests/rpc-smoke.mjs --harness pi [--model <pattern>] [--timeout 90000]
 *
 * What it checks: with /dt on and unapproved, a write must never succeed
 * before an Approve was sent — that's the one hard FAIL condition (a real
 * gate bypass). The model may legitimately reach that state two ways: try
 * the write, get blocked (tool_execution_end isError:true, GATE_REASON
 * text), present a graph, get Approved, then succeed on retry; OR skip
 * straight to presenting a graph/dialog with no blocked attempt at all,
 * get Approved, then succeed. Both are PASS. If the model does neither
 * (no graph, no tool call at all this run) that's inconclusive, not a
 * gate bug — a cheap model at default thinking level does not reliably
 * act every time (observed live, see docs/plans/2026-10-07-design-
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
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE_REASON_PREFIX = "Design Thinking mode is ON:";

/** Minimal .env loader (no dotenv dependency): walks up from this file
 *  looking for a .env, parses KEY=value lines, never overrides a var the
 *  shell already set. */
function loadDotEnv() {
	let dir = HERE;
	for (let i = 0; i < 6; i++) {
		const candidate = path.join(dir, ".env");
		if (existsSync(candidate)) {
			for (const line of readFileSync(candidate, "utf8").split("\n")) {
				const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
				if (!m) continue;
				const value = m[2].replace(/^["']|["']$/g, "");
				if (!(m[1] in process.env)) process.env[m[1]] = value;
			}
			return;
		}
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
}
loadDotEnv();

function parseArgs(argv) {
	const out = {
		// Standing preference: always use the model from PREFERRED_MODEL
		// (set in .env at the repo root, loaded by loadDotEnv() above) for
		// live pi/omp testing — never hardcode a model string here. Bare
		// fuzzy patterns like "haiku" also resolve ambiguously across
		// harnesses (pi picked an unconfigured amazon-bedrock credential
		// for it once, omp picked a configured openrouter one) — whatever
		// PREFERRED_MODEL holds should be a fully-qualified model string.
		model: process.env.PREFERRED_MODEL,
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
	let writeBlockedPreApproval = false;
	let writeSucceededPreApproval = false; // real gate bypass if this fires
	let writeSucceededPostApproval = false; // expected once Approve was sent
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
				if (obj.isError && text.startsWith(GATE_REASON_PREFIX)) {
					writeBlockedPreApproval = writeBlockedPreApproval || !approveSent;
				} else if (!obj.isError) {
					// A write succeeding is only a bypass if no Approve was ever
					// sent yet — the model may legitimately go straight to
					// presenting a graph (no blocked attempt first), get
					// approved, then write successfully on the next turn. Both
					// orderings are valid; only "succeeded with nothing armed"
					// is a real bug.
					if (approveSent) writeSucceededPostApproval = true;
					else writeSucceededPreApproval = true;
				}
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

	// Auto-approve any dialog the model triggers, whenever it shows up —
	// before or after a blocked attempt, both are legitimate orderings.
	// Stop early only once nothing more can be learned: a confirmed bypass
	// (bad, stop now) or a confirmed full round trip (block -> approve ->
	// succeed, nothing left to observe). Otherwise run the full timeout,
	// since the model may still be mid-turn.
	const deadline = Date.now() + opts.timeout;
	while (Date.now() < deadline && !writeSucceededPreApproval && !(writeBlockedPreApproval && writeSucceededPostApproval)) {
		if (pendingUiRequestId && !approveSent) {
			approveSent = true;
			send({ type: "extension_ui_response", id: pendingUiRequestId, value: "Approve — implement now" });
		}
		await sleep(500);
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
	console.log(
		`[rpc-smoke] writeBlockedPreApproval=${writeBlockedPreApproval} writeSucceededPostApproval=${writeSucceededPostApproval} dialogObserved=${dialogObserved} approveSent=${approveSent}`,
	);
	console.log(`[rpc-smoke] leftover files in scratch cwd: ${JSON.stringify(leftoverFiles)}`);
	console.log(`[rpc-smoke] observed cost: $${totalCost.toFixed(4)}`);

	const fail = [];
	if (writeSucceededPreApproval) fail.push("a write succeeded before any approval was sent — GATE BYPASS");
	if (!writeBlockedPreApproval && !writeSucceededPostApproval) {
		fail.push(
			"neither a pre-approval block nor a post-approval success was observed — the model likely never attempted the write at all this run (inconclusive, not necessarily a gate bug; re-run)",
		);
	}
	// A leftover file is only wrong if it happened WITHOUT a legitimate
	// approval having been sent first.
	if (leftoverFiles.length > 0 && !writeSucceededPostApproval) {
		fail.push(`scratch cwd has files it shouldn't: ${leftoverFiles.join(", ")}`);
	}

	if (fail.length) {
		console.error(`\nFAIL (${opts.harness}): ${fail.join("; ")}`);
		process.exitCode = 1;
	} else {
		const how = writeBlockedPreApproval
			? writeSucceededPostApproval
				? "blocked pre-approval, then succeeded after Approve — full round trip"
				: "blocked pre-approval, no later attempt observed"
			: "model skipped straight to a graph/dialog; Approve then let the write succeed";
		console.log(`\nPASS (${opts.harness}): ${how}.`);
		if (!dialogObserved) {
			console.log(
				"NOTE: the review dialog never surfaced this run (model didn't render a full graph) — not a failure, see header comment.",
			);
		}
	}
}

main();
