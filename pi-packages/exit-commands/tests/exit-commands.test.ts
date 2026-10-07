import { describe, expect, test } from "bun:test";

import exitCommandsExtension from "../extensions/exit-commands";

interface CommandRegistration {
	name: string;
	options: { description?: string; handler: (args: string, ctx: unknown) => Promise<void> | void };
}

function fakePi() {
	const inputHandlers: Array<(event: { text: string }, ctx: unknown) => unknown> = [];
	const commands: CommandRegistration[] = [];
	return {
		pi: {
			on: (_event: string, handler: never) => {
				inputHandlers.push(handler as never);
			},
			registerCommand: (name: string, options: CommandRegistration["options"]) => {
				commands.push({ name, options });
			},
		},
		inputHandlers,
		commands,
	};
}

function fakeCtx(shutdowns: number[], idle = true) {
	return {
		isIdle: () => idle,
		abort: () => {},
		shutdown: () => {
			shutdowns.push(1);
		},
	};
}

describe("exit-commands", () => {
	test("registers /exit command", () => {
		const { pi, commands } = fakePi();
		exitCommandsExtension(pi as never);
		expect(commands.map((c) => c.name)).toEqual(["exit"]);
		expect(commands[0]!.options.description).toBeTruthy();
	});

	test("/exit handler shuts down an idle context", () => {
		const { pi, commands } = fakePi();
		exitCommandsExtension(pi as never);
		const shutdowns: number[] = [];
		commands[0]!.options.handler("", fakeCtx(shutdowns) as never);
		expect(shutdowns).toHaveLength(1);
	});

	test("/exit handler aborts a streaming context before shutdown", () => {
		const { pi, commands } = fakePi();
		exitCommandsExtension(pi as never);
		const order: string[] = [];
		const ctx = {
			isIdle: () => false,
			abort: () => {
				order.push("abort");
			},
			shutdown: () => {
				order.push("shutdown");
			},
		};
		commands[0]!.options.handler("", ctx as never);
		expect(order).toEqual(["abort", "shutdown"]);
	});

	test.each([":q", ":q!", ":wq", ":wq!", ":x", ":xq"])(
		"%s shuts down and satisfies BOTH platform contracts",
		(input) => {
			const { pi, inputHandlers } = fakePi();
			exitCommandsExtension(pi as never);
			const handler = inputHandlers[0]!;
			const shutdowns: number[] = [];
			const result = handler({ text: input }, fakeCtx(shutdowns) as never) as Record<string, unknown>;
			// pi dispatches on `action`, omp dispatches on the boolean `handled`.
			expect(result).toEqual({ action: "handled", handled: true });
			expect(shutdowns).toHaveLength(1);
		},
	);

	test.each([":quit", ":q extra", ":Q", "hello :q", ":w", ":xq!"])(
		"non-quit input %j passes through without shutdown",
		(input) => {
			const { pi, inputHandlers } = fakePi();
			exitCommandsExtension(pi as never);
			const handler = inputHandlers[0]!;
			const shutdowns: number[] = [];
			const result = handler({ text: input }, fakeCtx(shutdowns) as never) as Record<string, unknown>;
			expect(result).toEqual({ action: "continue" });
			expect(shutdowns).toHaveLength(0);
		},
	);
});
