// Blocks IaC write/destructive invocations (ansible-playbook without --check,
// terragrunt/tofu/terraform apply-family, mise-wrapped forms) by running the
// shared check script (same deny contract as the Claude hook in
// plugins/iac-check-guard/).
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "iac-check-guard.sh",
);

type Verdict = { decision: string; reason?: string };

function readVerdict(raw: unknown): Verdict | null {
  if (typeof raw !== "object" || raw === null) return null;
  if (!("hookSpecificOutput" in raw)) return null;
  const hso = raw.hookSpecificOutput;
  if (typeof hso !== "object" || hso === null) return null;
  if (!("permissionDecision" in hso)) return null;
  const decision = hso.permissionDecision;
  if (typeof decision !== "string") return null;
  const reason = "permissionDecisionReason" in hso ? hso.permissionDecisionReason : undefined;
  return { decision, reason: typeof reason === "string" ? reason : undefined };
}

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
    let out: unknown = null;
    try {
      out = JSON.parse(await new Response(proc.stdout).text());
    } catch {}
    await proc.exited;

    const verdict = readVerdict(out);
    if (verdict?.decision === "deny") {
      return {
        block: true,
        reason: verdict.reason ?? "Blocked by iac-check-guard hook",
      };
    }
  });
}