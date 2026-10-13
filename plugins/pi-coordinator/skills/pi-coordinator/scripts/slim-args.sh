#!/usr/bin/env bash
# Sourced by launch.sh / continue.sh. Default worker flags: no pi packages, skills, prompt templates
# or context files (the prompt carries every rule), thinking off; keep only the git guard extension.
# Without this each worker loads every installed package (design-thinking, subagents, web access...):
# bigger prompts per turn, extra ceremony, and workers that spawn their own sub-agents.
# Override with PI_EXTRA_ARGS (set it to " " to run the full default pi).
# Default guard: the block-forbidden-git-add pi package in this repo (exists when run from a repo checkout
# or the marketplace clone, not from the plugin cache). Set PI_GUARD_EXT when it is elsewhere.
GUARD=${PI_GUARD_EXT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)/pi-packages/block-forbidden-git-add/extensions/block-forbidden-git-add.ts}
if [ -z "${PI_EXTRA_ARGS:-}" ]; then
  PI_EXTRA_ARGS="--no-extensions --no-skills --no-prompt-templates --no-context-files --thinking ${PI_THINKING:-off}"
  if [ -f "$GUARD" ]; then PI_EXTRA_ARGS="$PI_EXTRA_ARGS -e $GUARD"; else echo "slim-args: no git guard at $GUARD (set PI_GUARD_EXT)" >&2; fi
fi
export PI_EXTRA_ARGS
