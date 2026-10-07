/**
 * agent-notify: pi / omp extension.
 *
 * Fires a banner (terminal OSC or an OS notifier) when the agent finishes,
 * needs an approval, or is retrying, so the user can look away from the
 * terminal. Delivery is fire-and-forget and can never block the agent loop.
 *
 * Structure follows the Design Graph (docs/plans/2026-09-03-agent-notify-redesign.md):
 * happy path = parse → toMessage → admit → notify; all failure handling lives
 * at the defined joins (parse → ignored, tty/exec adapters, fire root). Host
 * globals enter only as injected Deps at this composition root.
 */

import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, writeSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { parseEvent, toMessage, type Message } from "./lib/events.ts";
import { makeSender, selectChannel, type Exec, type TtyWrite } from "./lib/channels.ts";
import { Throttle, type Clock } from "./lib/throttle.ts";

/** Everything the graph needs; provided at this root, swappable in tests. */
export interface Deps {
	platform: NodeJS.Platform;
	env: NodeJS.ProcessEnv;
	clock: Clock;
	log: (message: string) => void;
	tty: TtyWrite;
	exec: Exec;
	/** notify-send icon path; absent when the asset is missing. */
	icon?: string;
}

/** Production tty sink: /dev/tty, the route background processes use. No
 * stdout fallback: silently corrupting the TUI is worse than no banner. */
export function productionTty(sequence: string, log: (message: string) => void): void {
	let fd: number;
	try {
		fd = openSync("/dev/tty", "w");
	} catch (err) {
		log(`agent-notify: no controlling tty, banner dropped: ${String(err)}`);
		return;
	}
	try {
		writeSync(fd, sequence);
	} catch (err) {
		log(`agent-notify: tty write failed, banner dropped: ${String(err)}`);
	} finally {
		closeSync(fd);
	}
}

/** Production exec: fire-and-forget child; SpawnErr is logged, never unhandled. */
export function productionExec(log: (message: string) => void): Exec {
	return (file, args) => {
		const child = spawn(file, args, { stdio: "ignore" });
		child.on("error", (err) => log(`agent-notify: ${file} failed: ${err.message}`));
	};
}

function resolveIcon(): string | undefined {
	const path = fileURLToPath(new URL("../assets/icon.png", import.meta.url));
	return existsSync(path) ? path : undefined;
}

/** omp-only event surface absent from pi 1.0.4's ExtensionAPI types. */
interface OmpEvents {
	on(
		event: "session_stop" | "tool_approval_requested" | "auto_retry_start",
		handler: (event: Record<string, unknown>) => void,
	): void;
}

interface OmpLogger {
	logger?: { warn?: (message: string) => void };
}

function productionDeps(pi: ExtensionAPI): Deps {
	const log = (message: string) =>
		(pi as ExtensionAPI & OmpLogger).logger?.warn?.(message);
	return {
		platform: process.platform,
		env: process.env,
		clock: Date.now,
		log,
		tty: (sequence) => productionTty(sequence, log),
		exec: productionExec(log),
		icon: resolveIcon(),
	};
}

/** omp/pi only: session_stop's stop_hook_active means the agent resumed, not settled. */
export const SOURCE_BY_EVENT = {
	agent_settled: "settled",
	session_stop: "stop",
	tool_approval_requested: "approval",
	auto_retry_start: "retry",
	ui_prompt_start: "prompt",
} as const;

export default function agentNotify(pi: ExtensionAPI, deps?: Deps): void {
	const d = deps ?? productionDeps(pi);
	const omp = pi as ExtensionAPI & Partial<OmpEvents>;

	// (1) selectChannel at wiring: one log line answers "why no banner?".
	const channel = selectChannel(d.platform, d.env);
	d.log(`agent-notify: channel=${channel}`);

	const sender = makeSender(channel, d);
	const throttle = new Throttle(d.clock);

	const fire = (message: Message | undefined): void => {
		if (!message) return;
		// Input banners differ by tool/prompt; retries must collapse across attempts.
		if (!throttle.admit(message.kind === "input" ? `input:${message.body}` : message.kind)) return;
		// ☠ join: notify never throws by design; this catch is defect insurance.
		try {
			sender.notify(message);
		} catch (err) {
			d.log(`agent-notify: delivery failed: ${String(err)}`);
		}
	};

	// Per runtime: pi fires agent_settled + ui_prompt_start; omp fires session_stop,
	// tool_approval_requested, auto_retry_start. Foreign events never fire (inert).
	// agent_settled (pi) and session_stop (omp) both map to Event.settled at
	// the boundary; runtimes firing both are absorbed by the 30 s throttle.
	const subscribe = (source: keyof typeof SOURCE_BY_EVENT): void => {
		const handler = (raw?: Record<string, unknown>) =>
			fire(toMessage(parseEvent(SOURCE_BY_EVENT[source], raw)));
		if (source === "agent_settled") {
			pi.on(source, () => handler());
		} else if (source === "ui_prompt_start") {
			pi.on(source, (event) => handler(event as unknown as Record<string, unknown>));
		} else {
			omp.on?.(source, (event) => handler(event));
		}
	};

	subscribe("agent_settled");
	subscribe("session_stop");
	subscribe("tool_approval_requested");
	subscribe("auto_retry_start");
	subscribe("ui_prompt_start");
}
