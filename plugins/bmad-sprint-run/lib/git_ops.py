from __future__ import annotations

import subprocess
from typing import Optional

# Directories that must never be staged by the sprint runner.
# Not gitignored (Claude Code needs to read them) but excluded from commits.
_EXCLUDE_DIRS = ("_bmad/", "sprint-logs/")


def _run_git(*args: str, cwd: Optional[str] = None, check: bool = True) -> subprocess.CompletedProcess:
    cmd = ["git", *args]
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=check,
        timeout=60,
    )


def _stage_all(cwd: Optional[str] = None) -> None:
    """Stage all changes except excluded directories."""
    _run_git("add", "-A", "--", cwd=cwd, check=True)
    for d in _EXCLUDE_DIRS:
        _run_git("reset", "HEAD", "--", d, cwd=cwd, check=False)


def validate_branch(cwd: Optional[str] = None) -> bool:
    """Return True if current branch is not main or master."""
    result = _run_git("rev-parse", "--abbrev-ref", "HEAD", cwd=cwd, check=True)
    branch = result.stdout.strip()
    return branch not in ("main", "master")


def get_current_branch(cwd: Optional[str] = None) -> str:
    result = _run_git("rev-parse", "--abbrev-ref", "HEAD", cwd=cwd, check=True)
    return result.stdout.strip()


def get_current_hash(cwd: Optional[str] = None) -> str:
    result = _run_git("rev-parse", "--verify", "HEAD", cwd=cwd, check=True)
    return result.stdout.strip()


def has_uncommitted_changes(cwd: Optional[str] = None) -> bool:
    result = _run_git("status", "--porcelain", cwd=cwd, check=True)
    return bool(result.stdout.strip())


def create_checkpoint(story_key: str, cwd: Optional[str] = None) -> str:
    """Stage all changes and create a checkpoint commit. Return the commit hash."""
    _stage_all(cwd=cwd)
    _run_git("commit", "-m", f"checkpoint: pre-story {story_key}", "--allow-empty", cwd=cwd, check=True)
    return get_current_hash(cwd)


def verify_checkpoint(expected_hash: str, cwd: Optional[str] = None) -> bool:
    """Verify that HEAD matches the expected hash."""
    current = get_current_hash(cwd)
    return current == expected_hash


def rollback_to_checkpoint(hash: str, cwd: Optional[str] = None) -> None:
    """Hard reset to the given hash. Raises on failure."""
    _run_git("reset", "--hard", hash, cwd=cwd, check=True)
    actual = get_current_hash(cwd)
    if actual != hash:
        raise RuntimeError(f"Rollback verification failed: expected {hash}, got {actual}")


def get_diff_files(since_hash: str, cwd: Optional[str] = None) -> list[str]:
    """Return list of changed file paths since the given hash."""
    result = _run_git("diff", "--name-only", since_hash, cwd=cwd, check=True)
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def auto_commit(message: str, cwd: Optional[str] = None) -> Optional[str]:
    """Stage all changes and create a commit only if there are changes.

    Returns the commit hash, or None if nothing to commit.
    """
    if not has_uncommitted_changes(cwd=cwd):
        return None
    _stage_all(cwd=cwd)
    _run_git("commit", "-m", message, cwd=cwd, check=True)
    return get_current_hash(cwd)


def commit_completion(story_key: str, cwd: Optional[str] = None) -> str:
    """Stage all changes and create a completion commit. Return the commit hash."""
    _stage_all(cwd=cwd)
    _run_git("commit", "-m", f"story {story_key}: completed", "--allow-empty", cwd=cwd, check=True)
    return get_current_hash(cwd)


def commit_sprint_summary(completed: int, blocked: int, cwd: Optional[str] = None) -> str:
    """Create a final sprint summary commit."""
    _stage_all(cwd=cwd)
    msg = f"sprint-run: {completed} stories completed, {blocked} blocked"
    _run_git("commit", "-m", msg, "--allow-empty", cwd=cwd, check=True)
    return get_current_hash(cwd)
