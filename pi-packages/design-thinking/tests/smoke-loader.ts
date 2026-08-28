/**
 * STRICT loader + drift test — zero API calls.
 *
 * Verifies that pi's resource loader discovers this package's extension,
 * prompts, and skills exactly, and that skill bodies stay in sync with
 * their references/ sources.
 *
 * Run from anywhere:  node --experimental-strip-types tests/smoke-loader.ts
 * (imports resolve from this package's node_modules; all paths are
 * resolved from this file's own location — never from cwd.)
 *
 * Exit 0 = all checks pass. Exit 1 = at least one FAIL printed.
 */
import {
	DefaultResourceLoader,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, ".."); // package root, independent of cwd

let fail = 0;
function ok(cond: unknown, label: string) {
	console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
	if (!cond) fail++;
}

// ---------------------------------------------------------------- loader --
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pi-smoke-"));
fs.mkdirSync(path.join(tmp, "agent"), { recursive: true });

const loader = new DefaultResourceLoader({
	cwd: tmp, // isolated: no ambient project/global resources leak in
	agentDir: path.join(tmp, "agent"),
	additionalExtensionPaths: [PKG],
	// Ambient discovery (~/.agents/skills, ~/.pi/agent/skills) is machine-
	// specific. Strict determinism: keep ONLY skills whose file lives in
	// this package, then assert the exact set below.
	skillsOverride: (base) => ({
		skills: base.skills.filter((s) => s.filePath.startsWith(PKG + path.sep)),
		diagnostics: base.diagnostics,
	}),
});
await loader.reload();

const exts = loader.getExtensions();
const skills = loader.getSkills();
const prompts = loader.getPrompts();

const extPaths = (exts.extensions ?? []).map((e: { path?: string }) => e.path ?? "");
const wantExt = path.join(PKG, "extensions", "design-thinking.ts");
ok(extPaths.length === 1 && extPaths[0] === wantExt, `extension exactly ${path.relative(PKG, wantExt)} (got ${extPaths.map((p) => path.relative(PKG, p) || p).join(", ") || "none"})`);

const skillNames = skills.skills.map((s: { name: string }) => s.name).sort();
ok(
	JSON.stringify(skillNames) === JSON.stringify(["design-graph", "design-method", "graph-protocol"]),
	`skills exactly [design-graph, design-method, graph-protocol] (got ${skillNames.join(", ") || "none"})`,
);
for (const s of skills.skills as Array<{ name: string; filePath: string }>) {
	const rel = path.join("skills", s.name, "SKILL.md");
	ok(s.filePath === path.join(PKG, rel), `skill ${s.name} resolved from package: ${rel}`);
}
ok(skills.diagnostics.length === 0, `zero skill diagnostics${skills.diagnostics.length ? `: ${JSON.stringify(skills.diagnostics)}` : ""}`);

const promptNames = prompts.prompts.map((p: { name: string }) => p.name).sort();
ok(
	JSON.stringify(promptNames) === JSON.stringify(["cg", "cg-map", "cg-plan", "cg-review"]),
	`prompts exactly [cg, cg-map, cg-plan, cg-review] (got ${promptNames.join(", ") || "none"})`,
);
ok(prompts.diagnostics.length === 0, `zero prompt diagnostics${prompts.diagnostics.length ? `: ${JSON.stringify(prompts.diagnostics)}` : ""}`);

// ------------------------------------------------- references on disk ------
for (const f of ["protocol.md", "method.md", "design-graph.md", "effect-ts.md"]) {
	ok(fs.existsSync(path.join(PKG, "references", f)), `references/${f} exists`);
}

// ------------------------------------------------------- drift check ------
// Skill bodies are verbatim copies of references/ sources. Enforce sync:
// strip frontmatter, apply the documented link rewrites, normalize the
// documented trailing-footer replacement, then compare.
const LINK_REWRITES: Array<[RegExp, string]> = [
	[/\]\(protocol\.md\)/g, "](/skill:graph-protocol)"],
	[/\]\(method\.md\)/g, "](/skill:design-method)"],
	[/\]\(design-graph\.md\)/g, "](/skill:design-graph)"],
];
const PAIRS: Array<[string, string]> = [
	["graph-protocol", "protocol.md"],
	["design-method", "method.md"],
	["design-graph", "design-graph.md"],
];

function stripFrontmatter(text: string): string {
	return text.replace(/^---\n[\s\S]*?\n---\n/, "");
}
function normalize(text: string): string {
	// drop trailing footer blocks (source + skill variants) and trailing hr;
	// collapse ALL whitespace: content drift must fail, line re-wraps must not;
	// strip markdown link labels `[text]` -> keep target only: labels are
	// presentation, link targets are semantics
	return text
		.replace(/\n\*For the original Effect-TS[\s\S]*$/m, "\n")
		.replace(/\n\*The original Effect-TS[\s\S]*$/m, "\n")
		.replace(/(\n---\s*)+$/m, "\n")
		.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "($2)")
		.replace(/\s+/g, " ")
		.trim();
}

for (const [skillDir, srcFile] of PAIRS) {
	const skill = normalize(stripFrontmatter(fs.readFileSync(path.join(PKG, "skills", skillDir, "SKILL.md"), "utf8")));
	// rewrites apply to the SOURCE side: references point at files, skills
	// point at sibling skills
	const source = normalize(
		LINK_REWRITES.reduce(
			(t, [re, to]) => t.replace(re, to),
			fs.readFileSync(path.join(PKG, "references", srcFile), "utf8"),
		),
	);
	if (skill === source) {
		ok(true, `skills/${skillDir}/SKILL.md in sync with references/${srcFile}`);
	} else {
		// print first divergent line region for fast debugging
		const a = skill.split("\n");
		const b = source.split("\n");
		let i = 0;
		while (i < Math.max(a.length, b.length) && a[i] === b[i]) i++;
		ok(
			false,
			`skills/${skillDir}/SKILL.md DRIFTED from references/${srcFile} (first divergence at line ${i + 1}:\n  skill:   ${JSON.stringify(a[i])}\n  source:  ${JSON.stringify(b[i])})`,
		);
	}
}

// effect-ts must NOT be exposed as a skill (stack-agnostic guarantee)
ok(!skillNames.includes("effect-ts"), "references/effect-ts.md is NOT registered as a skill");

fs.rmSync(tmp, { recursive: true, force: true });

if (fail) {
	console.error(`\n${fail} CHECK(S) FAILED`);
	process.exit(1);
}
console.log("\nALL LOADER + DRIFT CHECKS PASS");
