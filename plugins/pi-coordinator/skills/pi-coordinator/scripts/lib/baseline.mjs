// Pure failure-set logic, shared by pi-run.mjs's gate and tests/baseline.test.mjs.
// A FailureSet is the sorted set of non-empty lines of a verify run's output, with the
// run's worktree root normalized away (biome/tsc print absolute paths that differ per worktree).

// Replace every occurrence of the worktree root in the output with '.', so lines compare
// equal across the baseline worktree and the worker worktree.
export const normalize = (out, root) => out.split(root).join('.');

export const failureSet = (out) =>
  [...new Set(out.split('\n').map((l) => l.trim()).filter(Boolean))].sort();

// Lines in `current` that are not in `baseline`. Empty array = no new failures.
export const newFailures = (current, baseline) => {
  const base = new Set(baseline);
  return current.filter((l) => !base.has(l));
};
