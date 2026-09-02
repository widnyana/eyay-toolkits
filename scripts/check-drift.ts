#!/usr/bin/env bun
/**
 * Shared-file maintenance between plugins/ (Claude Code) and pi-packages/ (pi/omp).
 *
 * Three classes:
 *   1. sync      — canonical file lives in pi-packages/; copied verbatim to plugins/.
 *   2. transform — canonical pi file + a mechanical substitution ("package" →
 *                  "plugin"), then whitespace-collapsed comparison (line-wrap
 *                  differences are not drift).
 *   3. excluded  — per-platform by design (READMEs, LICENSEs, adapters, pi-only
 *                  extensions/prompts/tests). Never synced, never checked.
 *
 * Usage:
 *   bun scripts/check-drift.ts          # sync shared files (writes)
 *   bun scripts/check-drift.ts --check  # verify only; exit 1 on drift (for pre-commit)
 */
import { readFileSync, writeFileSync } from "node:fs";

type Entry = { pi: string; plugin: string };

const SYNC: Entry[] = [
  {
    pi: "pi-packages/block-forbidden-git-add/extensions/block-forbidden-git-add.sh",
    plugin: "plugins/block-forbidden-git-add/hooks/scripts/block-forbidden-git-add.sh",
  },
  {
    pi: "pi-packages/iac-check-guard/extensions/iac-check-guard.sh",
    plugin: "plugins/iac-check-guard/hooks/scripts/iac-check-guard.sh",
  },
  { pi: "pi-packages/design-thinking/references/method.md", plugin: "plugins/design-thinking/references/method.md" },
  { pi: "pi-packages/design-thinking/references/design-graph.md", plugin: "plugins/design-thinking/references/design-graph.md" },
  { pi: "pi-packages/design-thinking/references/protocol.md", plugin: "plugins/design-thinking/references/protocol.md" },
  { pi: "pi-packages/design-thinking/references/effect-ts.md", plugin: "plugins/design-thinking/references/effect-ts.md" },
];

const TRANSFORM: Entry[] = [
  { pi: "pi-packages/design-thinking/skills/design-graph/SKILL.md", plugin: "plugins/design-thinking/skills/design-graph/SKILL.md" },
  { pi: "pi-packages/design-thinking/skills/design-method/SKILL.md", plugin: "plugins/design-thinking/skills/design-method/SKILL.md" },
];

// Line-wrap-insensitive comparison target.
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const toPlugin = (s: string) => s.replace(/\bpackage\b/g, "plugin");


function main() {
  const checkOnly = process.argv.includes("--check");
  const problems: string[] = [];

  for (const e of SYNC) {
    const src = readFileSync(e.pi, "utf8");
    const dst = readFileSync(e.plugin, "utf8");
    if (src === dst) continue;
    if (checkOnly) {
      problems.push(`drift: ${e.pi} != ${e.plugin} (run: bun scripts/check-drift.ts)`);
    } else {
      writeFileSync(e.plugin, src);
      console.log(`synced  ${e.plugin}  <-  ${e.pi}`);
    }
  }

  for (const e of TRANSFORM) {
    const src = readFileSync(e.pi, "utf8");
    const dst = readFileSync(e.plugin, "utf8");
    if (collapse(toPlugin(src)) === collapse(dst)) continue;
    if (checkOnly) {
      problems.push(`drift: ${e.pi} !~ ${e.plugin} (run: bun scripts/check-drift.ts, then review the diff)`);
    } else {
      writeFileSync(e.plugin, toPlugin(src));
      console.log(`synced  ${e.plugin}  <-  ${e.pi}  (package→plugin)`);
    }
  }

  if (problems.length) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  console.log(checkOnly ? "no drift" : "done");
}

main();
