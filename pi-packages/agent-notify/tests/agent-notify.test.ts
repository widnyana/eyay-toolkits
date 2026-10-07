/**
 * Tests for agent-notify, mirrored per module.
 * Run: bun test
 */
import { describe, expect, test } from "bun:test";

import { makeSender, osc777, osc9, osc99, selectChannel, type Exec } from "../extensions/lib/channels.ts";
import { parseEvent, sanitize, toMessage } from "../extensions/lib/events.ts";
import { Throttle } from "../extensions/lib/throttle.ts";
import agentNotify, { type Deps } from "../extensions/agent-notify.ts";

describe("throttle", () => {
	test("blocks identical keys inside the cooldown, admits after it passes", () => {
		let t = 0;
		const throttle = new Throttle(() => t);
		expect(throttle.admit("done")).toBe(true);
		t = 29_999;
		expect(throttle.admit("done")).toBe(false);
		t = 30_000;
		expect(throttle.admit("done")).toBe(true);
	});

	test("different keys are independent", () => {
		const throttle = new Throttle(() => 0);
		expect(throttle.admit("done")).toBe(true);
		expect(throttle.admit("input")).toBe(true);
	});
});

describe("event boundary", () => {
	test("sanitize strips C1 controls", () => {
		expect(sanitize("a\u009cb\u009bc")).toBe("a b c");
	});

	test("settled maps to done message", () => {
		expect(parseEvent("settled")).toEqual({ type: "settled" });
		expect(toMessage(parseEvent("settled"))?.kind).toBe("done");
	});

	test("stop with stop_hook_active truthy is ignored", () => {
		expect(parseEvent("stop", { stop_hook_active: true })).toEqual({ type: "ignored" });
		expect(parseEvent("stop", { stop_hook_active: false })).toEqual({ type: "settled" });
		expect(parseEvent("stop", {})).toEqual({ type: "settled" });
	});

	test("approval sanitizes the tool name; missing falls back", () => {
		expect(parseEvent("approval", { toolName: "bash\x1b]0;pwned\n" })).toEqual({
			type: "approval",
			tool: "bash ]0;pwned",
		});
		expect(parseEvent("approval", {})).toEqual({ type: "approval", tool: "a tool" });
	});

	test("retry attempt coerced; non-numeric becomes '?'", () => {
		expect(parseEvent("retry", { attempt: 3 })).toEqual({ type: "retrying", attempt: "3" });
		expect(parseEvent("retry", { attempt: "x" })).toEqual({ type: "retrying", attempt: "?" });
		expect(parseEvent("retry")).toEqual({ type: "retrying", attempt: "?" });
	});

	test("sanitize caps length and strips control characters", () => {
		expect(sanitize("a\tb\nc")).toBe("a b c");
		expect(sanitize("x".repeat(200))).toHaveLength(80);
		expect(sanitize("")).toBe("");
	});
});

describe("channel selection", () => {
	const win: NodeJS.ProcessEnv = { WT_SESSION: "1" };

	test("kitty and iTerm win on every platform", () => {
		expect(selectChannel("darwin", { KITTY_WINDOW_ID: "1" })).toBe("osc99");
		expect(selectChannel("linux", { TERM_PROGRAM: "iTerm.app" })).toBe("osc9");
	});

	test("darwin defaults to osc777", () => {
		expect(selectChannel("darwin", {})).toBe("osc777");
	});

	test("win32: WT_SESSION → powershell, else none", () => {
		expect(selectChannel("win32", win)).toBe("powershell");
		expect(selectChannel("win32", {})).toBe("none");
	});

	test("linux: ghostty/wezterm → osc777, unknown terminal → notify-send", () => {
		expect(selectChannel("linux", { TERM: "xterm-ghostty" })).toBe("osc777");
		expect(selectChannel("linux", { TERM_PROGRAM: "WezTerm" })).toBe("osc777");
		expect(selectChannel("linux", { TERM: "xterm-256color" })).toBe("notify-send");
		expect(selectChannel("freebsd", {})).toBe("notify-send");
	});
});

describe("sequence builders", () => {
	test("osc99 emits two-part kitty sequence with ST terminators", () => {
		expect(osc99("T", "B")).toBe("\x1b]99;i=1:d=0;T\x1b\\\x1b]99;i=1:p=body;B\x1b\\");
	});
});

describe("senders", () => {
	const msg = { kind: "done" as const, title: "T", body: "B" };

	test("osc senders write the sequence through the tty sink", () => {
		const written: string[] = [];
		const sender = makeSender("osc777", {
			tty: (s) => written.push(s),
			exec: () => undefined,
		});
		sender.notify(msg);
		expect(written).toEqual([osc777("T", "B")]);
	});

	test("notify-send execs argv with icon, never a shell string", () => {
		const calls: Array<{ file: string; args: readonly string[] }> = [];
		const exec: Exec = (file, args) => calls.push({ file, args });
		makeSender("notify-send", { tty: () => undefined, exec, icon: "/i.png" }).notify(msg);
		expect(calls).toEqual([{ file: "notify-send", args: ["-i", "/i.png", "T", "B"] }]);
	});

	test("powershell execs with single-quote escaping", () => {
		const calls: Array<{ file: string; args: readonly string[] }> = [];
		const exec: Exec = (file, args) => calls.push({ file, args });
		makeSender("powershell", { tty: () => undefined, exec }).notify({
			kind: "input",
			title: "T'i",
			body: "B'b",
		});
		expect(calls[0]?.file).toBe("powershell.exe");
		expect(calls[0]?.args[2]).toContain("B''b");
	});

	test("none is a silent no-op", () => {
		let called = false;
		makeSender("none", { tty: () => (called = true), exec: () => (called = true) }).notify(msg);
		expect(called).toBe(false);
	});
});

describe("extension wiring", () => {
	interface Handler {
		(event: Record<string, unknown> | undefined): void;
	}

	function makeHarness(deps: Deps) {
		const handlers = new Map<string, Handler>();
		const pi = {
			on: (event: string, h: Handler) => handlers.set(event, h),
		} as unknown as Parameters<typeof agentNotify>[0];
		agentNotify(pi, deps);
		return {
			fire: (event: string, raw?: Record<string, unknown>) =>
				handlers.get(event)?.(raw),
		};
	}

	function makeDeps() {
		const deps: Deps = {
			platform: "linux",
			env: { TERM: "xterm-256color" },
			clock: () => 0,
			log: () => undefined,
			tty: () => undefined,
			exec: () => undefined,
			icon: "/i.png",
		};
		return deps;
	}

	test("delivers one banner per event through the chosen channel", () => {
		const deps = makeDeps();
		const sent: unknown[] = [];
		deps.exec = (file, args) => sent.push([file, args]);
		const h = makeHarness(deps);
		h.fire("tool_approval_requested", { toolName: "bash" });
		expect(sent).toEqual([["notify-send", ["-i", "/i.png", "Approval needed", "Agent needs approval: bash"]]]);
	});

	test("pi ui_prompt_start delivers an input banner", () => {
		const deps = makeDeps();
		const sent: unknown[] = [];
		deps.exec = (file, args) => sent.push([file, args]);
		makeHarness(deps).fire("ui_prompt_start", { title: "Pick one" });
		expect(sent).toEqual([["notify-send", ["-i", "/i.png", "Input needed", "Agent is waiting: Pick one"]]]);
	});

	test("distinct approvals inside the cooldown both deliver", () => {
		const deps = makeDeps();
		let count = 0;
		deps.exec = () => count++;
		const h = makeHarness(deps);
		h.fire("tool_approval_requested", { toolName: "bash" });
		h.fire("tool_approval_requested", { toolName: "edit" });
		h.fire("tool_approval_requested", { toolName: "bash" });
		expect(count).toBe(2);
	});

	test("retry attempts collapse to one banner", () => {
		const deps = makeDeps();
		let count = 0;
		deps.exec = () => count++;
		const h = makeHarness(deps);
		h.fire("auto_retry_start", { attempt: 1 });
		h.fire("auto_retry_start", { attempt: 2 });
		expect(count).toBe(1);
	});

	test("same kind within the cooldown is suppressed", () => {
		const deps = makeDeps();
		let count = 0;
		deps.exec = () => count++;
		const h = makeHarness(deps);
		h.fire("agent_settled");
		h.fire("session_stop", {});
		expect(count).toBe(1);
	});

	test("ignored events deliver nothing", () => {
		const deps = makeDeps();
		let count = 0;
		deps.exec = () => count++;
		const h = makeHarness(deps);
		h.fire("session_stop", { stop_hook_active: true });
		expect(count).toBe(0);
	});

	test("a throwing sender is logged, never thrown into the host", () => {
		const deps = makeDeps();
		const logged: string[] = [];
		deps.log = (m) => logged.push(m);
		deps.exec = () => {
			throw new Error("boom");
		};
		const h = makeHarness(deps);
		expect(() => h.fire("agent_settled")).not.toThrow();
		expect(logged.some((m) => m.includes("delivery failed"))).toBe(true);
	});

	test("logs the channel once at wiring", () => {
		const deps = makeDeps();
		const logged: string[] = [];
		deps.log = (m) => logged.push(m);
		makeHarness(deps);
		expect(logged).toEqual(["agent-notify: channel=notify-send"]);
	});
});
