#!/usr/bin/env node
// usage: pi-run.mjs <worktree> <prompt-file> <out-dir> [model] [timeout-min]
// Runs one pi in RPC mode in <worktree>, sends the prompt, waits for agent_settled,
// writes <out-dir>/events.jsonl (each line carries "t": ms), <out-dir>/result.txt.
// With PI_VERIFY_CMD set, the driver gates every settle itself: tree clean, commits on PI_BASE..HEAD,
// then PI_VERIFY_CMD in the worktree. Fail = the failure tail goes back to the SAME session
// (max PI_VERIFY_ROUNDS, default 2). Pass = <out-dir>/verify.ok holds the verified HEAD sha.
// Exit 0 settled (and verified if gated), 1 error, 2 timeout, 3 stalled, 4 verify failed.
import { spawn, execSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, createWriteStream } from 'node:fs';

const [cwd, promptFile, outDir, model = 'openrouter/z-ai/glm-5.3-flash', tmin = '45'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const events = createWriteStream(`${outDir}/events.jsonl`);
const extra = (process.env.PI_EXTRA_ARGS || '').split(' ').filter(Boolean); // e.g. slim worker flags
const pi = spawn('pi', ['--mode', 'rpc', '--no-session', '--model', model, ...extra], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
pi.stderr.pipe(createWriteStream(`${outDir}/stderr.log`));

const send = (o) => pi.stdin.write(JSON.stringify(o) + '\n');
const done = (code) => { try { pi.stdin.end(); } catch {} setTimeout(() => { pi.kill(); process.exit(code); }, 2000); };
const timer = setTimeout(() => { writeFileSync(`${outDir}/result.txt`, 'TIMEOUT'); done(2); }, Number(tmin) * 60000);

const MAX = Number(process.env.MAXTOOLS || 0);
const VERIFY = process.env.PI_VERIFY_CMD || '';
const ROUNDS = Number(process.env.PI_VERIFY_ROUNDS || 2);
const BASE = process.env.PI_BASE || 'main';
let tools = 0, capped = false, wrapped = false, nudged = 0, nudging = false, rounds = 0, failed = '';
const seen = new Map(); // tool signature -> times called

const sh = (cmd) => execSync(cmd, { cwd, encoding: 'utf8' }).trim();
// Driver-owned gate (trusted, unlike the worker's own report). Returns null on pass, else the send-back message.
const gate = () => {
  const dirty = sh('git status --porcelain');
  if (dirty) return `Uncommitted files:\n${dirty}\nStage them by explicit path and commit now. Then stop.`;
  if (sh(`git rev-list --count ${BASE}..HEAD`) === '0') return 'No commit on this branch. Stage your changed files by explicit path and commit now. Then stop.';
  let out;
  try {
    out = execSync(`${VERIFY} 2>&1`, { cwd, encoding: 'utf8', shell: '/bin/bash', maxBuffer: 64 << 20 });
  } catch (e) {
    out = String(e.stdout ?? '') + String(e.stderr ?? '');
    writeFileSync(`${outDir}/verify.log`, out);
    return `The checks failed after your commit. Last 40 lines:\n${out.split('\n').slice(-40).join('\n')}\nFix only this, do not run the checks yourself, commit the fix by explicit path. Then stop.`;
  }
  writeFileSync(`${outDir}/verify.log`, out);
  writeFileSync(`${outDir}/verify.ok`, sh('git rev-parse HEAD') + '\n');
  return null;
};

let idleTimer = null;
const bump = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { writeFileSync(`${outDir}/result.txt`, 'STALLED: no events for 6 minutes'); done(3); }, 6 * 60000); };
bump();
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
      if (!m.success) { writeFileSync(`${outDir}/result.txt`, 'PROMPT REJECTED: ' + m.error); done(1); }
    } else if (m.type === 'tool_execution_start' && (() => {
      // any earlier identical call counts, not only the previous one (workers re-read ranges out of order)
      const sig = m.toolName + JSON.stringify(m.args);
      const n = (seen.get(sig) || 0) + 1; seen.set(sig, n);
      return n >= 3 && nudged < 2 && !capped;
    })()) {
      nudged++; nudging = true;
      send({ type: 'abort' });
    } else if (m.type === 'agent_settled' && nudging) {
      nudging = false;
      send({ id: 'nudge' + nudged, type: 'prompt', message: 'You repeated the same tool call 3 times. Do NOT read that again. Make the edit now with ONE edit call using the exact text from the task, or if you cannot, stop and say why in 3 lines.' });
    } else if (m.type === 'tool_execution_start' && MAX && ++tools > MAX && !capped) {
      capped = true;
      send({ type: 'abort' });
    } else if (m.type === 'agent_settled' && capped && !wrapped) {
      wrapped = true;
      send({ id: 'wrap', type: 'prompt', message: 'STOP. Tool budget is used up. Do not call any tool. In 4 lines: what you changed, what is left.' });
    } else if (m.type === 'agent_settled') {
      clearTimeout(idleTimer); // the gate can run longer than the idle window
      const back = VERIFY && !capped ? gate() : null;
      bump();
      if (back && rounds < ROUNDS) { rounds++; send({ id: 'verify' + rounds, type: 'prompt', message: back }); continue; }
      if (back) failed = `VERIFY FAILED after ${ROUNDS} send-backs:\n${back}\n---\n`;
      send({ id: 'last', type: 'get_last_assistant_text' });
    } else if (m.type === 'response' && m.command === 'get_last_assistant_text') {
      clearTimeout(timer);
      writeFileSync(`${outDir}/result.txt`, (capped ? 'CAPPED AT ' + MAX + ' TOOLS\n' : '') + failed + (m.data?.text ?? '(no text)'));
      done(failed ? 4 : 0);
    }
  }
});
pi.on('exit', (c) => { clearTimeout(timer); events.end(); });
send({ id: 'p1', type: 'prompt', message: readFileSync(promptFile, 'utf8') });
