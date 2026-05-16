from __future__ import annotations

import subprocess
from typing import Optional

# This module is intentionally READ-ONLY.
#
# The sprint runner must never mutate the git repository. Claude Code (via the
# bmad skills) owns every commit. `git reset --hard` is FORBIDDEN: a
# false-failing quality gate once used it to roll back to a checkpoint and
# destroyed completed, committed work.
#
# Do NOT add functions here that run `git commit`, `git add`, `git reset`,
# `git checkout -- `, `git restore`, `git clean`, or any other command that
# changes the working tree, the index, or branch history. Read-only inspection
# only (rev-parse, status, diff, log, ...).


def _run_git(
    *args: str,
    cwd: Optional[str] = None,
    check: bool = True,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=check,
        timeout=60,
    )


def validate_branch(cwd: Optional[str] = None) -> bool:
    """Return True if the current branch is not main or master."""
    result = _run_git("rev-parse", "--abbrev-ref", "HEAD", cwd=cwd, check=True)
    return result.stdout.strip() not in ("main", "master")


def get_current_branch(cwd: Optional[str] = None) -> str:
    result = _run_git("rev-parse", "--abbrev-ref", "HEAD", cwd=cwd, check=True)
    return result.stdout.strip()


def get_current_hash(cwd: Optional[str] = None) -> str:
    result = _run_git("rev-parse", "--verify", "HEAD", cwd=cwd, check=True)
    return result.stdout.strip()


def has_uncommitted_changes(cwd: Optional[str] = None) -> bool:
    result = _run_git("status", "--porcelain", cwd=cwd, check=True)
    return bool(result.stdout.strip())


def get_diff_files(since_hash: str, cwd: Optional[str] = None) -> list[str]:
    """Return the list of file paths changed since the given hash."""
    result = _run_git("diff", "--name-only", since_hash, cwd=cwd, check=True)
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]
