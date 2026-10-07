/**
 * Event boundary: raw runtime payloads → trusted Event → Message.
 *
 * This is the only place untrusted data is parsed (🔒 unknown → trusted).
 * Everything downstream receives typed shapes and may trust them.
 */

/** Runtime event spellings, one per pi/omp subscription. */
export type Source = "settled" | "stop" | "approval" | "retry" | "prompt";

/** Trusted event variants after boundary parsing. */
export type Event =
	| { type: "settled" }
	| { type: "approval"; tool: string }
	| { type: "prompt"; title: string }
	| { type: "retrying"; attempt: string }
	| { type: "ignored" };

/** Notification categories. The title is constant per kind. */
export type Kind = "done" | "attention" | "input";

/** A fully trusted, single-line notification. */
export interface Message {
	kind: Kind;
	title: string;
	body: string;
}

/** Cap on untrusted strings (tool names); keeps banners one line and short. */
const MAX_FIELD = 80;

function readString(raw: Record<string, unknown> | undefined, field: string): string | undefined {
	const value = raw?.[field];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Strip control characters, collapse to a sane single line, cap length. */
export function sanitize(input: string): string {
	const cleaned = input
		.replace(/[\x00-\x1f\x7f-\x9f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return cleaned.length > MAX_FIELD ? `${cleaned.slice(0, MAX_FIELD - 1)}…` : cleaned;
}

/**
 * 🔒 Parse one raw payload into a trusted Event. Never throws; unknown
 * shapes degrade to `{ignored}`.
 */
export function parseEvent(source: Source, raw?: Record<string, unknown>): Event {
	switch (source) {
		case "settled":
			return { type: "settled" };
		case "stop":
			// stop_hook_active: a stop hook resumed the agent, it did not settle.
			return raw?.stop_hook_active ? { type: "ignored" } : { type: "settled" };
		case "approval":
			return { type: "approval", tool: sanitize(readString(raw, "toolName") ?? "a tool") };
		case "prompt":
			return { type: "prompt", title: sanitize(readString(raw, "title") ?? "a prompt") };
		case "retry": {
			const n = raw?.attempt;
			const attempt =
				typeof n === "number" && Number.isFinite(n) ? String(Math.trunc(n)) : "?";
			return { type: "retrying", attempt };
		}
	}
}

/** Map a trusted Event to its Message, or undefined when nothing to show. */
export function toMessage(event: Event): Message | undefined {
	switch (event.type) {
		case "settled":
			return { kind: "done", title: "Agent finished", body: "Run complete, awaiting your input" };
		case "approval":
			return { kind: "input", title: "Approval needed", body: `Agent needs approval: ${event.tool}` };
		case "prompt":
			return { kind: "input", title: "Input needed", body: `Agent is waiting: ${event.title}` };
		case "retrying":
			return { kind: "attention", title: "Retrying request", body: `Provider retry, attempt ${event.attempt}` };
		case "ignored":
			return undefined;
	}
}
