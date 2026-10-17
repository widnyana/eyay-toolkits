#!/usr/bin/env bash
# Smoke tests: bash syntax for every script + unit tests for the pure baseline-diff logic.
# Run: bash test.sh
set -e
cd "$(dirname "$0")"
for f in scripts/*.sh; do bash -n "$f" && echo "ok: bash syntax $f"; done
node --test tests/
