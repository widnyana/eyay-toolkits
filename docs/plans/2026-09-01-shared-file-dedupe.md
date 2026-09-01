# Plan — shared-file dedupe between `plugins/` and `pi-packages/` (2026-09-01)

## Problem

Plugins shipped for both Claude Code (`plugins/`) and pi/omp (`pi-packages/`)
duplicate shared files. Edits on one side silently drift from the other.
pi-only behavior (extensions, prompts, pi-specific tests) must never be
overwritten by a Claude-side sync.

## Design

Graph: `edit pi-package → check-drift.ts:sync → plugins copy`; every commit
passes through the pre-commit gate `check-drift.ts --check`, which exits 1 on
drift (retry = run sync, review diff).

### File classes

1. **sync (verbatim)** — canonical in `pi-packages/`, copied byte-for-byte:
   - `pi-packages/block-forbidden-git-add/extensions/block-forbidden-git-add.sh`
     → `plugins/block-forbidden-git-add/hooks/scripts/block-forbidden-git-add.sh`
   - `pi-packages/design-thinking/references/{method,design-graph,protocol,effect-ts}.md`
2. **transform** — "package" → "plugin" substitution when written to `plugins/`,
   compared whitespace-collapsed (line-wrap is not drift):
   - `pi-packages/design-thinking/skills/{design-graph,design-method}/SKILL.md`
3. **excluded (per-platform by design)** — READMEs, LICENSEs, adapters
   (`hooks/hooks.json` vs `extensions/*.ts`), pi-only `prompts/`, `tests/`.
   Each side edited independently.

Adapters stay separate forever: Claude Code consumes `hooks.json` +
`${CLAUDE_PLUGIN_ROOT}`; pi consumes an `ExtensionAPI` `tool_call` handler.

## Tooling

- `scripts/check-drift.ts` (Bun): default mode = sync (writes `plugins/`
  copies); `--check` = verify only, exit 1 on drift.
- `.git/hooks/pre-commit` calls `bun scripts/check-drift.ts --check`.
  `.git/hooks` is not versioned — reinstall after repo re-clone:

  ```sh
  cat > .git/hooks/pre-commit <<'EOF'
  #!/bin/sh
  bun scripts/check-drift.ts --check || {
    echo "pre-commit: shared-file drift detected. Run: bun scripts/check-drift.ts"
    exit 1
  }
  EOF
  chmod +x .git/hooks/pre-commit
  ```

## Drift merged before wiring the check

- design-thinking `SKILL.md` x2: pi link syntax (`[X](/skill:name)`) unified to
  backtick cross-references used by the Claude side; "package"/"plugin"
  wording resolved via the transform rule.
- `references/method.md`: stray blank line removed (now verbatim-synced).

## Versions

- `plugins/block-forbidden-git-add` 1.0.0 → 1.0.1 (hook script change, pending user edit)
- `plugins/design-thinking` 0.1.2 → 0.1.3 (synced references)
- `pi-packages/design-thinking` 0.0.3 → 0.0.4 (SKILL.md phrasing normalization)

## Follow-ups (not in scope now)

- If the shared surface grows large, revisit full templated rendering.
- design-thinking `README.md`/`LICENSE.md` remain intentionally per-platform
  (different authors/attribution: r17x for pi).
