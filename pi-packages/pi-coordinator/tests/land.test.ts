/**
 * land.sh smoke test — runs the real script against a scratch git repo.
 * Run: node --experimental-strip-types tests/land.test.ts  (or via mise run pi-package:verify)
 */
import assert from "node:assert/strict";
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = new URL("../skills/pi-coordinator/scripts/land.sh", import.meta.url).pathname;

const sh = (cmd: string, cwd: string) => execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" });
const runLand = (cwd: string, env: Record<string, string> = {}) =>
  spawnSync("bash", [SCRIPT, "t1", "fix"], { cwd, env: { ...process.env, PI_REPO: cwd, ...env }, encoding: "utf8" });

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "pi-coordinator-land-"));
  const g = (c: string, w = dir) => sh(c, w);
  g("git init -q -b main .");
  g('git config user.email t@t'); g('git config user.name t');
  g("echo base > f.txt"); g("git add ."); g('git commit -qm base');
  // simulate a worker run: worktree + branch + one commit
  g("git worktree add .worktrees/fix/pi-t1 -b fix/pi-t1 main");
  const w = join(dir, ".worktrees/fix/pi-t1");
  g("echo change > f.txt", w);
  g("git add f.txt", w);
  g('git commit -qm "fix(scope): one-line subject" -m "worker body"', w);
  return dir;
}

// 1. happy path: squash onto main, cleanup, keep worker subject/body
{
  const dir = makeRepo();
  const r = runLand(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const log = sh("git --no-pager log --format=%s%n%b -1", dir);
  assert.match(log, /fix\(scope\): one-line subject/);
  assert.match(log, /worker body/);
  assert.equal(sh("git log --oneline main..fix/pi-t1 2>/dev/null || echo gone", dir).trim(), "gone");
  assert.ok(!sh("git worktree list", dir).includes("pi-t1"), "worktree removed");
  rmSync(dir, { recursive: true, force: true });
  console.log("ok   happy path squash + cleanup");
}

// 2. dirty worktree refused, main untouched
{
  const dir = makeRepo();
  writeFileSync(join(dir, ".worktrees/fix/pi-t1/stray.txt"), "x");
  const r = runLand(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /UNCOMMITTED CHANGES/);
  const log = sh("git --no-pager log --oneline -1", dir);
  assert.match(log, /base/);
  rmSync(dir, { recursive: true, force: true });
  console.log("ok   dirty worktree refused");
}

// 3. merge conflict refused, main untouched
{
  const dir = makeRepo();
  // diverge main so the worker branch conflicts
  sh("echo divergent > f.txt", dir);
  sh("git commit -aqm diverge", dir);
  const r = runLand(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /MERGE WOULD CONFLICT/);
  const log = sh("git --no-pager log --oneline -1", dir);
  assert.match(log, /diverge/);
  rmSync(dir, { recursive: true, force: true });
  console.log("ok   conflict refused");
}

// 4. VERIFY_CMD failure refused
{
  const dir = makeRepo();
  const r = runLand(dir, { VERIFY_CMD: "exit 1" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /VERIFY FAILED/);
  rmSync(dir, { recursive: true, force: true });
  console.log("ok   VERIFY_CMD failure refused");
}

console.log("all land.sh tests passed");
