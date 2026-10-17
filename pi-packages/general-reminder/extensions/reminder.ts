/**
 * General Reminder — pi/omp extension
 *
 * Injects user-configured reminders into every run. The config lives in the
 * project, named by harness:
 *   - omp → <cwd>/.omp/reminders.json
 *   - pi  → <cwd>/.pi/reminders.json
 * (omp is detected via its pi.logger surface, absent on pi.)
 *
 * Shape:
 * {
 *   "reminders": [
 *     "Plain text — injected on every run",
 *     { "text": "One-shot note", "once": true }
 *   ]
 * }
 *
 * Bare strings are always-on. `once: true` entries fire on the first run of
 * the session only. Flags reset on session_start; edit the file, then restart
 * or switch sessions to pick changes up.
 */

import fs from "node:fs";
import path from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/** Hard cap so a big config cannot bloat every run's prompt. */
const REMINDER_CAP = 20;

const HEADER = "REMINDERS — standing instructions configured by the user:";

interface ReminderEntry {
	text: string;
	once: boolean;
	fired: boolean;
}

export default function generalReminderExtension(pi: ExtensionAPI) {
	let entries: ReminderEntry[] = [];

	/** Read the harness-appropriate config. A missing file is silent (opt-in
	 *  surface); a malformed file is reported for a one-time warning. */
	function readEntries(cwd: string): { entries: ReminderEntry[]; parseError?: string } {
		const file = path.join(
			cwd,
			typeof (pi as ExtensionAPI & { logger?: unknown }).logger === "object" ? ".omp" : ".pi",
			"reminders.json",
		);
		let raw: string;
		try {
			raw = fs.readFileSync(file, "utf8");
		} catch {
			return { entries: [] };
		}
		try {
			const parsed = JSON.parse(raw) as { reminders?: unknown };
			const list = Array.isArray(parsed?.reminders) ? parsed.reminders : [];
			const out: ReminderEntry[] = [];
			for (const item of list) {
				if (out.length >= REMINDER_CAP) break;
				if (typeof item === "string" && item.trim()) {
					out.push({ text: item.trim(), once: false, fired: false });
				} else if (item && typeof item === "object") {
					const rec = item as { text?: unknown; once?: unknown };
					if (typeof rec.text === "string" && rec.text.trim()) {
						out.push({ text: rec.text.trim(), once: rec.once === true, fired: false });
					}
				}
			}
			return { entries: out };
		} catch (err) {
			return { entries: [], parseError: `general-reminder: cannot parse ${file} — ${String(err)}` };
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		const { entries: loaded, parseError } = readEntries(ctx.cwd);
		entries = loaded;
		if (parseError && ctx.hasUI) ctx.ui.notify(parseError, "warning");
	});

	pi.on("before_agent_start", async (event) => {
		const due = entries.filter((e) => !e.once || !e.fired);
		if (due.length === 0) return undefined;
		for (const e of due) if (e.once) e.fired = true;
		return {
			systemPrompt:
				event.systemPrompt + "\n\n" + HEADER + "\n" + due.map((e) => "- " + e.text).join("\n") + "\n",
		};
	});
}