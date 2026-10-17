#!/usr/bin/env node
// usage: pi-run.mjs <worktree> <prompt-file> <out-dir> [model] [timeout-min]
// [model] empty/omitted = let pi use its own configured default (no --model flag passed).
// Runs one pi in RPC mode in <worktree>, sends the prompt, waits for agent_settled,
// writes <out-dir>/events.jsonl (each line carries "t": ms), <out-dir>/state.txt (phase
// transitions) and <out-dir>/result.txt — first line "OUTCOME: <one of>" is the driver's
// verdict, the rest is the worker's last message. Outcomes: VERIFIED, SETTLED-UNVERIFIED
// (no gate), CAPPED, VERIFY-FAILED, TIMEOUT, STALLED, ERROR, EXITED(code). "settled" and
// "verified" are distinct: exit 0 with a gate that never ran is SETTLED-UNVERIFIED.
// With PI_VERIFY_CMD set, the driver gates every settle itself: tree clean, commits on PI_BASE..HEAD,
// then PI_VERIFY_CMD in the worktree. Baseline-aware: before the first turn the driver runs
// PI_VERIFY_CMD once on PI_BASE (cached per base+cmd in $PI_WORK, shared by all workers of a job)
// and fails a worker only on failure lines NEW vs that baseline — a dirty repo no longer masks results.
// Set PI_BASELINE_PREP if the baseline worktree needs deps installed first (fresh worktrees have none).
// A gate failure goes back to the SAME session with the new failure lines (max PI_VERIFY_ROUNDS, default 2).
// Pass writes <out-dir>/verify.ok (verified HEAD sha) and verify.log (with a baseline-diff note).
// Exit 0 settled (and verified if gated), 1 error, 2 timeout, 3 stalled, 4 verify failed.
import { spawn, execSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, createWriteStream, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { failureSet, normalize, newFailures } from './lib/baseline.mjs';

const [cwd, promptFile, outDir, model = '', tmin = '45'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const events = createWriteStream(`${outDir}/events.jsonl`);
const state = (s) => { try { writeFileSync(`${outDir}/state.txt`, `${Date.now()} ${s}\n`); } catch {} };
const extra = (process.env.PI_EXTRA_ARGS || '').split(' ').filter(Boolean); // e.g. slim worker flags
const modelArgs = model ? ['--model', model] : [];

const MAX = Number(process.env.MAXTOOLS || 0);
const VERIFY = process.env.PI_VERIFY_CMD || '';
const ROUNDS = Number(process.env.PI_VERIFY_ROUNDS || 2);
const BASE = process.env.PI_BASE || 'main';
const S = process.env.PI_WORK || `${process.env.TMPDIR || '/tmp'}/pi-work`;
const TMIN = Number(process.env.PI_TIMEOUT_MIN || tmin);
mkdirSync(S, { recursive: true });
const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', shell: '/bin/bash', ...opts }).trim();
const sleep = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch {} };

// Baseline (T): PI_VERIFY_CMD output on PI_BASE, cached per (base, cmd) so N workers run it once.
// Exit code is data, not a crash: a dirty baseline is still a usable failure set. Only infra
// failures (worktree add, prep) make it unusable — the gate then fails open and says so in verify.log.
const hash = createHash('sha1').update(`${BASE}\n${VERIFY}`).digest('hex').slice(0, 12);
const cacheFile = `${S}/baseline-${hash}.json`;
const computeBaseline = () => {
  state(`baseline: verifying ${BASE}`);
  const tmp = `${S}/baseline-${hash}`;
  try {
    execSync(`git worktree add --detach '${tmp}' '${BASE}'`, { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return { lines: [], error: `git worktree add ${BASE} failed: ${String(e.stderr || e).trim()}` };
  }
  try {
    if (process.env.PI_BASELINE_PREP) sh(process.env.PI_BASELINE_PREP, { cwd: tmp, maxBuffer: 64 << 20 });
    let out = '';
    try { out = sh(`(${VERIFY}) 2>&1`, { cwd: tmp, maxBuffer: 64 << 20 }); }
    catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); } // exit code is data: a dirty baseline is still a usable failure set
    return { lines: failureSet(normalize(out, tmp)) };
  } catch (e) {
    return { lines: [], error: `baseline run failed: ${String(e).trim()}` };
  } finally {
    try { execSync(`git worktree remove --force '${tmp}'`, { cwd, encoding: 'utf8', stdio: 'pipe' }); } catch {}
  }
};
const ensureBaseline = () => {
  try { return JSON.parse(readFileSync(cacheFile, 'utf8')); } catch {} // cache hit (T)
  const lock = `${cacheFile}.lock`;
  let winner = false;
  try { mkdirSync(lock); winner = true; } catch {} // loser waits for the winner's cache
  if (!winner) {
    const deadline = Date.now() + TMIN * 60000;
    while (!existsSync(cacheFile) && Date.now() < deadline) sleep(5000);
    try { return JSON.parse(readFileSync(cacheFile, 'utf8')); } catch {} // winner died: run it ourselves
  }
  const result = computeBaseline();
  if (result.error) console.error(`pi-run: baseline unavailable, gate fails open: ${result.error}`);
  writeFileSync(cacheFile, JSON.stringify(result));
  rmSync(lock, { recursive: true, force: true });
  return result;
};
const baseline = VERIFY ? ensureBaseline() : null;

// Driver-owned gate (trusted, unlike the worker's own report). Returns null on pass, else the send-back message.
const gate = () => {
  const dirty = sh('git status --porcelain', { cwd });
  if (dirty) return `Uncommitted files:\n${dirty}\nStage them by explicit path and commit now. Then stop.`;
  if (sh(`git rev-list --count ${BASE}..HEAD`, { cwd }) === '0') return 'No commit on this branch. Stage your changed files by explicit path and commit now. Then stop.';
  let out = '', ok = false;
  try { out = sh(`(${VERIFY}) 2>&1`, { cwd, maxBuffer: 64 << 20 }); ok = true; }
  catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); } // failure output is data
  const bl = baseline && !baseline.error ? baseline : null;
  const cur = failureSet(normalize(out, cwd));
  const isNew = bl ? newFailures(cur, bl.lines) : cur;
  const note = bl
    ? (isNew.length ? `${isNew.length} new failure line(s) vs baseline ${BASE}` : 'no new failures vs baseline')
    : (baseline?.error ? `baseline unavailable (${baseline.error}) — every failure counts as new` : 'no baseline — every failure counts');
  writeFileSync(`${outDir}/verify.log`, out + `\n--- gate: ${note} ---\n`);
  if (ok || (bl && isNew.length === 0)) { writeFileSync(`${outDir}/verify.ok`, sh('git rev-parse HEAD', { cwd }) + '\n'); return null; }
  return `The checks failed after your commit (${note}). New failures, last 40 lines:\n${isNew.slice(-40).join('\n')}\nFix only this, do not run the checks yourself, commit the fix by explicit path. Then stop.`;
};

let pi, timer, idleTimer;
const done = (code) => { try { pi.stdin.end(); } catch {} setTimeout(() => { pi.kill(); process.exit(code); }, 2000); };
// Every exit path goes through finish: outcome first line of result.txt, then state, then exit.
const finish = (code, outcome, detail = '') => {
  writeFileSync(`${outDir}/result.txt`, `OUTCOME: ${outcome}\n${detail}`);
  state(`done: ${outcome}`);
  done(code);
};

let tools = 0, capped = false, wrapped = false, nudged = 0, nudging = false, rounds = 0, failed = '';
const seen = new Map(); // tool signature -> times called

const bump = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => finish(3, 'STALLED', 'no events for 6 minutes'), 6 * 60000); };

function drive() {
  state('running');
  timer = setTimeout(() => finish(2, 'TIMEOUT', `exceeded ${TMIN} minutes`), TMIN * 60000);
  bump();
  pi = spawn('pi', ['--mode', 'rpc', '--no-session', ...modelArgs, ...extra], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  pi.stderr.pipe(createWriteStream(`${outDir}/stderr.log`));
  let buf = '';
  pi.stdout.setEncoding('utf8');
  pi.stdout.on('data', (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, '');
      buf = buf.slice(i + 1);
      if (!line) continue;
      events.write(line.startsWith('{') ? `{"t":${Date.now()},${line.slice(1)}\n` : line + '\n'); bump();
      let m;
      try { m = JSON.parse(line); } catch { continue; }
      if (m.type === 'response' && m.command === 'prompt') {
        if (!m.success) finish(1, 'ERROR', 'PROMPT REJECTED: ' + m.error);
      } else if (m.type === 'tool_execution_start' && (() => {
        // any earlier identical call counts, not only the previous one (workers re-read ranges out of order)
        const sig = m.toolName + JSON.stringify(m.args);
        const n = (seen.get(sig) || 0) + 1; seen.set(sig, n);
        return n >= 3 && nudged < 2 && !capped;
      })()) {
        nudged++; nudging = true;
        pi.stdin.write(JSON.stringify({ type: 'abort' }) + '\n');
      } else if (m.type === 'agent_settled' && nudging) {
        nudging = false;
        pi.stdin.write(JSON.stringify({ id: 'nudge' + nudged, type: 'prompt', message: 'You repeated the same tool call 3 times. Do NOT read that again. Make the edit now with ONE edit call using the exact text from the task, or if you cannot, stop and say why in 3 lines.' }) + '\n');
      } else if (m.type === 'tool_execution_start' && MAX && ++tools > MAX && !capped) {
        capped = true;
        pi.stdin.write(JSON.stringify({ type: 'abort' }) + '\n');
      } else if (m.type === 'agent_settled' && capped && !wrapped) {
        wrapped = true;
        pi.stdin.write(JSON.stringify({ id: 'wrap', type: 'prompt', message: 'STOP. Tool budget is used up. Do not call any tool. In 4 lines: what you changed, what is left.' }) + '\n');
      } else if (m.type === 'agent_settled') {
        clearTimeout(idleTimer); // the gate can run longer than the idle window
        const back = VERIFY && !capped ? gate() : null;
        if (back && rounds < ROUNDS) {
          rounds++; state(`gate round ${rounds}: failed, sending back`); bump();
          pi.stdin.write(JSON.stringify({ id: 'verify' + rounds, type: 'prompt', message: back }) + '\n');
          continue;
        }
        if (back) failed = `VERIFY FAILED after ${ROUNDS} send-backs:\n${back}\n---\n`;
        state(failed ? 'verify-failed' : VERIFY ? 'verified' : 'settled-unverified');
        pi.stdin.write(JSON.stringify({ id: 'last', type: 'get_last_assistant_text' }) + '\n');
      } else if (m.type === 'response' && m.command === 'get_last_assistant_text') {
        clearTimeout(timer);
        const outcome = failed ? 'VERIFY-FAILED' : capped ? 'CAPPED' : VERIFY ? 'VERIFIED' : 'SETTLED-UNVERIFIED';
        finish(failed ? 4 : 0, outcome, (capped ? `Tool budget ${MAX} exhausted.\n` : '') + (m.data?.text ?? '(no text)'));
      }
    }
  });
  pi.on('exit', (c) => {
    clearTimeout(timer); events.end();
    // a crashed worker must end the monitor's wait, not leave it polling forever
    if (!existsSync(`${outDir}/result.txt`)) {
      try { writeFileSync(`${outDir}/result.txt`, `OUTCOME: EXITED(${c})\nworker process exited before settling; see events.jsonl and stderr.log\n`); } catch {}
      state(`done: EXITED(${c})`);
      process.exit(c === 0 ? 0 : 1);
    }
  });
  state('running: prompt sent');
  pi.stdin.write(JSON.stringify({ id: 'p1', type: 'prompt', message: readFileSync(promptFile, 'utf8') }) + '\n');
}

drive();
