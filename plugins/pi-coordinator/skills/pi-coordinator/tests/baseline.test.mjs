import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, failureSet, newFailures } from '../scripts/lib/baseline.mjs';

test('normalize strips the worktree root from absolute paths', () => {
  const out = '/tmp/pi-work/baseline-x/src/a.ts:1: err\n/tmp/pi-work/baseline-x/src/b.ts:2: err';
  assert.equal(normalize(out, '/tmp/pi-work/baseline-x'), './src/a.ts:1: err\n./src/b.ts:2: err');
});

test('failureSet trims, drops empties, dedupes, sorts', () => {
  assert.deepEqual(failureSet('\n  b err  \n\na err\nb err\n'), ['a err', 'b err']);
});

test('newFailures: subset of baseline = no new failures', () => {
  assert.deepEqual(newFailures(['a err', 'b err'], ['a err', 'b err', 'c err']), []);
});

test('newFailures: new line is reported', () => {
  assert.deepEqual(newFailures(['a err', 'NEW'], ['a err']), ['NEW']);
});

test('baseline pass simulation: worker output equals dirty baseline (paths normalized) → no new failures', () => {
  const base = failureSet(normalize('/wt-baseline/src/a.ts:1: expected `;`, found `}`\n✖ 499 problems', '/wt-baseline'));
  const cur = failureSet(normalize('/wt-worker/src/a.ts:1: expected `;`, found `}`\n✖ 499 problems', '/wt-worker'));
  assert.deepEqual(newFailures(cur, base), []);
});

test('count-line drift fails conservatively (499 → 512)', () => {
  const base = failureSet('✖ 499 problems');
  const cur = failureSet('✖ 512 problems');
  assert.equal(newFailures(cur, base).length, 1);
});

test('newFailures with empty baseline: everything is new (fail-open)', () => {
  assert.deepEqual(newFailures(['x'], []), ['x']);
});
