import { describe, expect, test } from "bun:test";

import {
	ICON_PATH,
	createNotifier,
	iconExists,
	terminalBundleId,
	type Exec,
} from "../extensions/agent-notify";

interface Call {
	file: string;
	args: string[];
}

function fakeExec(calls: Call[]): Exec {
	return (file, args) => {
		calls.push({ file, args });
	};
}

describe("createNotifier", () => {
	test("darwin without terminal-notifier uses osascript with args array", () => {
		const calls: Call[] = [];
		const n = createNotifier("darwin", fakeExec(calls), {
			hasIcon: false,
			hasTerminalNotifier: false,
		});
		expect(n).toBeDefined();
		n!.notify("done", "Agent finished", "hello \"world\" \\ ok");
		expect(calls).toHaveLength(1);
		expect(calls[0].file).toBe("osascript");
		// single -e script arg, never a shell string
		expect(calls[0].args[0]).toBe("-e");
		expect(calls[0].args).toHaveLength(2);
		expect(calls[0].args[1]).toContain('display notification "hello \\"world\\" \\\\ ok"');
	});

	test("darwin with terminal-notifier focuses the terminal on click", () => {
		const calls: Call[] = [];
		const n = createNotifier("darwin", fakeExec(calls), {
			hasIcon: true,
			hasTerminalNotifier: true,
			activateBundle: "com.mitchellh.Ghostty",
		});
		n!.notify("done", "Agent finished", "body");
		expect(calls[0].file).toBe("terminal-notifier");
		// macOS has no icon-override API: -appIcon is never sent
		expect(calls[0].args).not.toContain("-appIcon");
		expect(calls[0].args).not.toContain("-i");
		expect(calls[0].args).toContain("-activate");
		expect(calls[0].args).toContain("com.mitchellh.Ghostty");
	});

	test("darwin terminal-notifier omits -activate without a bundle", () => {
		const calls: Call[] = [];
		const n = createNotifier("darwin", fakeExec(calls), {
			hasIcon: true,
			hasTerminalNotifier: true,
		});
		n!.notify("done", "Agent finished", "body");
		expect(calls[0].file).toBe("terminal-notifier");
		expect(calls[0].args).not.toContain("-activate");
	});

	test("darwin falls back to osascript when terminal-notifier exits non-zero", () => {
		const calls: Call[] = [];
		const listeners: Array<(code: unknown) => void> = [];
		const exec: Exec = (file, args) => {
			calls.push({ file, args });
			return {
				on: (_event: string, cb: (code: unknown) => void) => {
					listeners.push(cb);
				},
			};
		};
		const n = createNotifier("darwin", exec, {
			hasIcon: false,
			hasTerminalNotifier: true,
		});
		n!.notify("done", "Agent finished", "body");
		expect(calls[0].file).toBe("terminal-notifier");
		expect(listeners).toHaveLength(1);
		listeners[0](1); // permission denied
		expect(calls[1].file).toBe("osascript");
		expect(calls[1].args[1]).toContain("Agent finished");
		listeners[0](0); // success: no fallback
		expect(calls).toHaveLength(2);
	});

	test("darwin terminal-notifier omits -appIcon and -activate when unavailable", () => {
		const calls: Call[] = [];
		const n = createNotifier("darwin", fakeExec(calls), {
			hasIcon: false,
			hasTerminalNotifier: true,
		});
		n!.notify("done", "Agent finished", "body");
		expect(calls[0].file).toBe("terminal-notifier");
		expect(calls[0].args).not.toContain("-appIcon");
		expect(calls[0].args).not.toContain("-activate");
	});

	test("linux uses notify-send with -i when the icon exists", () => {
		const calls: Call[] = [];
		const n = createNotifier("linux", fakeExec(calls), {
			hasIcon: true,
			hasTerminalNotifier: false,
		});
		n!.notify("input", "Approval needed", "bash");
		expect(calls[0].file).toBe("notify-send");
		expect(calls[0].args).toEqual(["Approval needed", "bash", "-a", "pi-agent", "-i", ICON_PATH]);
	});

	test("linux without icon omits -i", () => {
		const calls: Call[] = [];
		const n = createNotifier("linux", fakeExec(calls), {
			hasIcon: false,
			hasTerminalNotifier: false,
		});
		n!.notify("input", "Approval needed", "bash");
		expect(calls[0].file).toBe("notify-send");
		expect(calls[0].args).toEqual(["Approval needed", "bash", "-a", "pi-agent"]);
	});

	test("unsupported platform returns undefined", () => {
		expect(
			createNotifier("win32", fakeExec([]), { hasIcon: true, hasTerminalNotifier: false }),
		).toBeUndefined();
	});

	test("terminalBundleId maps TERM_PROGRAM", () => {
		expect(terminalBundleId("ghostty")).toBe("com.mitchellh.Ghostty");
		expect(terminalBundleId("iTerm.app")).toBe("com.googlecode.iterm2");
		expect(terminalBundleId("Apple_Terminal")).toBe("com.apple.Terminal");
		expect(terminalBundleId("unknown")).toBeUndefined();
		expect(terminalBundleId(undefined)).toBeUndefined();
	});

	test("bundled icon file resolves", () => {
		expect(iconExists()).toBe(true);
	});
});
