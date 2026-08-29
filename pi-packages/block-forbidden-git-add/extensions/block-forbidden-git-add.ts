// Blocks `git add -A` and friends by running the shared check script
// (same deny contract as the Claude hook in plugins/block-forbidden-git-add/).
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "block-forbidden-git-add.sh",
);

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return;
    const command = (event.input as { command?: string } | undefined)?.command;
    if (!command) return;

    const proc = Bun.spawn(["bash", SCRIPT], {
      stdin: new Response(JSON.stringify({ tool_input: { command } })).body,
      stdout: "pipe",
      stderr: "pipe",
    });
    let out: any = null;
    try {
      out = JSON.parse(await new Response(proc.stdout).text());
    } catch {}
    await proc.exited;

    const decision = out?.hookSpecificOutput?.permissionDecision;
    if (decision === "deny") {
      return {
        block: true,
        reason:
          out.hookSpecificOutput.permissionDecisionReason ??
          "Blocked by block-forbidden-git-add hook",
      };
    }
  });
}
