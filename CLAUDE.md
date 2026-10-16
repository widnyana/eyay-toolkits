# AGENTS.md

This file provides guidance to agents working in this repository. **Detailed rules live
in the per-directory `AGENTS.md` files — read the one for the tree you are touching.**

## Repository Overview

eyay-toolkits is a Claude Code **plugin marketplace**: a flat collection of independent,
self-contained plugins under `plugins/`, registered in `.claude-plugin/marketplace.json`.
Install via `npx skills add widnyana/eyay-toolkits` (skills.sh). There is no root build
system, package manager, or CI — each plugin/package is independent.

## Where the details live

| Tree | Rules file | Covers |
|---|---|---|
| `plugins/` | `plugins/AGENTS.md` | Plugin anatomy, the plugin table, plugin tests, the add/modify checklist |
| `pi-packages/` | `pi-packages/AGENTS.md` | Dual-runtime (pi + omp) rules, version/omp checklists, shared-file drift sync |

Also: `CONTRIBUTING.md` (new plugin requirements), root `README.md` and `INSTALL.md`
(kept in sync by the per-dir checklists).

## Global rules — MANDATORY

### Local testing and validation before any push

Nothing ships to the remote without the user testing it locally first. The user
decides when to push; agents NEVER push and NEVER ask to push. The session of
2026-09-03 shipped multiple unverified pushes — do not repeat that.

- **Verify on the real surface before declaring done.** A green test suite is not
  user-visible verification.
- **Heavy automated tests are the baseline**, not a substitute. Run the tests the
  per-dir rules file names; never report pass rates from memory.
- **Claims must be verified or labeled.** Untested behavior is `[INFERENCE]` until
  someone runs it. When a claim is later falsified by a live test, correct the record
  immediately — including in docs and checklists that repeated it.

### No over-engineering

If the solution becomes overly complex, the design is WRONG — stop and re-plan at
the problem layer, not the implementation layer. Before adding machinery
(subprocess chains, fallback trees, platform adapters), check whether the
platform already solves the problem natively. When a simpler design exists,
the complex one is a bug, not a v1.

### Documentation sync

Every per-dir `AGENTS.md` carries a checklist for its tree. Before calling a task
that adds, renames, or materially changes a plugin or pi package **done**, walk the
checklist for the tree you touched. Every applicable line, every time — no silent skips.
If a line genuinely doesn't apply, state why in one line instead of skipping silently.
If a doc is out of scope for the task (e.g. user said stop), list it explicitly as a
follow-up in your final message — never drop it on the floor.
