/**
 * agent-notify — pi / omp extension
 *
 * Fires OS notifications when the agent:
 *   - finishes its run              (agent_settled — pi and omp)
 *   - needs an approval / input     (tool_approval_requested — omp)
 *   - is retrying a failed request  (auto_retry_start — omp)
 *
 * Delivery: macOS `osascript display notification`, Linux `notify-send`.
 * A missing/failing notifier never touches the agent loop — errors are logged
 * and dropped. Repeated notifications of the same kind are throttled.
 */

import { spawn as spawnProcess } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Notification categories, mapped from agent events. */
export type Kind = "done" | "attention" | "input";

/** Minimal seam so tests can run the same graph with a fake executor. */
export type Exec = (file: string, args: readonly string[]) => unknown;

/** Suppression window for identical (kind, title) notifications. */
const COOLDOWN_MS = 30_000;

/** Max tracked throttle keys before the oldest is evicted. */
const THROTTLE_CAP = 128;

export interface Notifier {
	notify(kind: Kind, title: string, body: string): void;
}

function isThrottled(lastAt: Record<string, number>, key: string): boolean {
	const now = Date.now();
	for (const k of Object.keys(lastAt)) {
		if (now - lastAt[k] >= COOLDOWN_MS) delete lastAt[k];
	}
	return now - (lastAt[key] ?? 0) < COOLDOWN_MS;
}

/** Drop the oldest tracked key once the throttle table outgrows its cap. */
function evictOldest(lastAt: Record<string, number>) {
	const keys = Object.keys(lastAt);
	if (keys.length > THROTTLE_CAP) delete lastAt[keys[0]];
}

/** Icon shipped next to the extension; platforms use it when the file exists. */
export const ICON_PATH = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"assets",
	"icon.png",
);

export function iconExists(iconPath: string = ICON_PATH): boolean {
	try {
		return statSync(iconPath).isFile();
	} catch {
		return false;
	}
}

export function findOnPath(file: string): boolean {
	const dirs = (process.env.PATH ?? "").split(":").filter(Boolean);
	return dirs.some((dir) => {
		try {
			return statSync(path.join(dir, file)).isFile();
		} catch {
			return false;
		}
	});
}

/**
 * Pick the platform notifier. Returns `undefined` when the platform has no
 * known delivery path — the extension then registers nothing.
 * `deps` defaults probe the real machine; tests inject fixed values.
 */
export interface NotifierDeps {
	hasIcon: boolean;
	hasTerminalNotifier: boolean;
	/** macOS bundle id to focus on click; defaults to the running terminal. */
	activateBundle?: string;
}

/** Bundle id of the terminal the session runs in, for notification click focus. */
export function terminalBundleId(termProgram?: string): string | undefined {
	const BUNDLE_BY_TERM: Record<string, string> = {
		ghostty: "com.mitchellh.Ghostty",
		"iTerm.app": "com.googlecode.iterm2",
		Apple_Terminal: "com.apple.Terminal",
		vscode: "com.microsoft.VSCode",
		WezTerm: "com.github.wez.wezterm",
		kitty: "net.kovidgoyal.kitty",
	};
	if (!termProgram) return undefined;
	return BUNDLE_BY_TERM[termProgram];
}

export function createNotifier(
	platform: NodeJS.Platform = os.platform(),
	exec: Exec = (file, args) => spawnProcess(file, args.slice()),
	deps: NotifierDeps = {
		hasIcon: iconExists(),
		hasTerminalNotifier: findOnPath("terminal-notifier"),
		activateBundle: terminalBundleId(process.env.TERM_PROGRAM),
	},
): Notifier | undefined {
	const useIcon = deps.hasIcon;
	if (platform === "darwin") {
		// terminal-notifier supports -activate (click focus) and -sound; plain
		// osascript cannot. The banner ICON cannot be overridden on macOS —
		// Apple provides no API; it always comes from the sending app bundle.
		if (deps.hasTerminalNotifier) {
			const osascript = (t: string, b: string) =>
				exec("osascript", [
					"-e",
					`display notification ${JSON.stringify(b)} with title ${JSON.stringify(t)} sound name "Glass"`,
				]);
			return {
				notify: (_kind, title, body) => {
					const args = ["-title", title, "-message", body, "-sound", "Glass"];
					if (deps.activateBundle) args.push("-activate", deps.activateBundle);
					const child = exec("terminal-notifier", args);
					// terminal-notifier exits non-zero when macOS denies it
					// notification permission — fall back to osascript, which
					// inherits the terminal's grant.
					if (
						child &&
						typeof child === "object" &&
						"on" in child &&
						typeof child.on === "function"
					) {
						child.on("close", (code: unknown) => {
							if (code !== 0) osascript(title, body);
						});
					}
				},
			};
		}
		return {
			notify: (_kind, title, body) => {
				// Args array, never a shell string: notification text must not
				// become a command.
				exec("osascript", [
					"-e",
					`display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)} sound name "Glass"`,
				]);
			},
		};
	}
	if (platform === "linux") {
		return {
			notify: (_kind, title, body) => {
				const args = [title, body, "-a", "pi-agent"];
				if (useIcon) args.push("-i", ICON_PATH);
				exec("notify-send", args);
			},
		};
	}
	return undefined;
}

/** omp-only event surface absent from pi 0.84.3's ExtensionAPI types. */
interface OmpEvents {
	on(
		event: "session_stop" | "tool_approval_requested" | "auto_retry_start",
		handler: (event: Record<string, unknown>) => void,
	): void;
}

/** omp-only pi.logger surface. */
interface OmpLogger {
	logger?: { warn?: (msg: string) => void };
}

function readString(event: Record<string, unknown>, field: string): string | undefined {
	const value = event?.[field];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default function agentNotify(pi: ExtensionAPI) {
	// One-line reason: probe for runtime fields omp adds and pi 0.84.3 lacks.
	const omp = pi as ExtensionAPI & Partial<OmpEvents> & OmpLogger;

	const notifier = createNotifier();
	if (!notifier) {
		omp.logger?.warn?.("agent-notify: no notifier for this platform, disabled");
		return;
	}

	const lastAt: Record<string, number> = {};
	const deliver = notifier.notify.bind(notifier);

	function fire(kind: Kind, title: string, body: string) {
		const key = `${kind}:${title}`;
		if (isThrottled(lastAt, key)) return;
		lastAt[key] = Date.now();
		evictOldest(lastAt);
		try {
			deliver(kind, title, body);
		} catch (err) {
			omp.logger?.warn?.(`agent-notify: delivery failed: ${String(err)}`);
		}
	}

	// Done signal, both spellings: pi emits agent_settled; omp emits
	// session_stop (its main-session stop hook) and may not emit agent_settled
	// at all. Runtimes that fire both are deduped by the 30s throttle.
	pi.on("agent_settled", () => {
		fire("done", "Agent finished", "Run complete — awaiting your input");
	});
	omp.on?.("session_stop", (event) => {
		if (
			event &&
			typeof event === "object" &&
			"stop_hook_active" in event &&
			event.stop_hook_active
		) {
			return;
		}
		fire("done", "Agent finished", "Run complete — awaiting your input");
	});

	// omp-only: a tool call is sitting on an approval dialog.
	omp.on?.("tool_approval_requested", (event) => {
		const tool = readString(event, "toolName") ?? "a tool";
		fire("input", "Approval needed", `Agent needs approval: ${tool}`);
	});

	// omp-only: provider request failed and auto-retry kicked in.
	omp.on?.("auto_retry_start", (event) => {
		const n = event?.["attempt"];
		const attempt = typeof n === "number" ? String(n) : "?";
		fire("attention", "Retrying request", `Provider retry, attempt ${attempt}`);
	});
}
