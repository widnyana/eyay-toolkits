/**
 * exit-commands — pi / omp extension
 *
 * Adds vim-style quit input aliases (`:q`, `:q!`, `:wq`, `:wq!`, `:x`, `:xq`)
 * and a `/exit` command that gracefully shut the REPL down via ctx.shutdown().
 * Non-matching input passes through untouched. (`/quit` is built into both
 * pi and omp; this package adds only `/exit` and the vim-style aliases.)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Exact (trimmed) input lines treated as quit. Session autosave makes the
 *  write-family synonyms equivalent to a plain quit. */
const QUIT_INPUTS: Record<string, true> = {
	":q": true,
	":q!": true,
	":wq": true,
	":wq!": true,
	":x": true,
	":xq": true,
};

export default function exitCommandsExtension(pi: ExtensionAPI) {
	pi.on("input", (event, ctx) => {
		// Both platforms must see "handled": pi dispatches on `action`,
		// omp dispatches on the boolean `handled` flag.
		if (!QUIT_INPUTS[event.text.trim()]) return { action: "continue" };
		if (!ctx.isIdle()) ctx.abort();
		ctx.shutdown();
		return { action: "handled", handled: true } as { action: "handled" };
	});

	pi.registerCommand("exit", {
		description: "Gracefully exit the REPL (same as /quit)",
		handler: async (_args, ctx) => {
			if (!ctx.isIdle()) ctx.abort();
			ctx.shutdown();
		},
	});
}
