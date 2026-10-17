#!/usr/bin/env bash
# Sourced by launch.sh / continue.sh. Default worker flags: no pi packages, skills, prompt templates
# or context files (the prompt carries every rule), thinking off; keep only the git guard extension.
# Without this each worker loads every installed package (design-thinking, subagents, web access...):
# bigger prompts per turn, extra ceremony, and workers that spawn their own sub-agents.
# Override with PI_EXTRA_ARGS (set it to " " to run the full default pi).
# Default guard: the block-forbidden-git-add pi package in this repo (exists when run from a repo checkout
# or the marketplace clone, not from the plugin cache). Set PI_GUARD_EXT when it is elsewhere.
# The guard is structural: launch refuses to run without it (stage-all would otherwise be blocked by
# prompt text only). Explicit opt-out: PI_GUARD_EXT=off.
GUARD=${PI_GUARD_EXT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)/pi-packages/block-forbidden-git-add/extensions/block-forbidden-git-add.ts}
if [ -z "${PI_EXTRA_ARGS:-}" ]; then
  PI_EXTRA_ARGS="--no-extensions --no-skills --no-prompt-templates --no-context-files --thinking ${PI_THINKING:-off}"
  if [ "$GUARD" = "off" ]; then echo "slim-args: git guard disabled by PI_GUARD_EXT=off — stage-all is NOT blocked structurally" >&2
  elif [ -f "$GUARD" ]; then PI_EXTRA_ARGS="$PI_EXTRA_ARGS -e $GUARD"
  else echo "slim-args: git guard not found at $GUARD — refusing to launch (set PI_GUARD_EXT to the guard path, or PI_GUARD_EXT=off to force)" >&2; exit 1
  fi
fi
export PI_EXTRA_ARGS
