// monitor.sh guard tests: no .mon-state redirect errors, escalation + bounded abort on a
// launch that never produced output, DONE + exit 0 when all workers finished.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'monitor.sh');

function run(units, over = {}, timeout = 15_000) {
  const e = { ...process.env, PI_POLL: '0', ...over };
  try {
    return { status: 0, stdout: execFileSync('bash', [script, ...units], { env: e, timeout, encoding: 'utf8' }), stderr: '' };
  } catch (err) {
    return { status: err.status, signal: err.signal, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

test('all done → DONE line with outcome, exit 0', () => {
  const S = mkdtempSync(join(tmpdir(), 'mon-'));
  mkdirSync(join(S, 'out-a'), { recursive: true });
  writeFileSync(join(S, 'out-a', 'result.txt'), 'OUTCOME: VERIFIED\nall good\n');
  const r = run(['a'], { PI_WORK: S });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /a DONE: VERIFIED — all good/);
  assert.doesNotMatch(r.stderr, /No such file/);
});

test('no driver output → remedy line, never a .mon-state error, abort exit 1', () => {
  const S = mkdtempSync(join(tmpdir(), 'mon-'));
  const r = run(['b'], { PI_WORK: S, PI_MISSING_TICKS: '2' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /out-b has no driver output yet/);
  assert.match(r.stdout, /run-b\.log/);
  assert.match(r.stdout, /launch\.sh b/);
  assert.doesNotMatch(r.stderr, /\.mon-state/);
});

test('state.txt present → transitions print, no errors even when idle', () => {
  const S = mkdtempSync(join(tmpdir(), 'mon-'));
  const out = join(S, 'out-c');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'state.txt'), '12 running\n');
  const r = run(['c'], { PI_WORK: S, PI_MISSING_TICKS: '30' }, 2_000); // runs until killed
  assert.match(r.stdout, /c: running/);
  assert.doesNotMatch(r.stderr, /No such file/);
});
