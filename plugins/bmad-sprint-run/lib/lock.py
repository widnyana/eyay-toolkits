from __future__ import annotations

import fcntl
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator


@contextmanager
def sprint_lock(project_root: str) -> Generator[None, None, None]:
    """Exclusive process lock for the sprint runner.

    Uses fcntl.flock so the kernel releases the lock automatically if the
    process is killed (including SIGKILL). A stale lock file from a previous
    crash does not block future runs — the flock call succeeds once the old
    process is gone.

    Raises RuntimeError immediately if another instance holds the lock.
    """
    lock_path = Path(project_root) / ".sprint-runner.lock"
    fd = os.open(str(lock_path), os.O_CREAT | os.O_WRONLY)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        pid = _read_pid(lock_path)
        os.close(fd)
        raise RuntimeError(
            f"Another sprint-runner is already running (PID {pid}). "
            f"If that process is dead, remove {lock_path} and retry."
        )
    try:
        _write_pid(fd)
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
        try:
            lock_path.unlink()
        except FileNotFoundError:
            pass


def _write_pid(fd: int) -> None:
    os.ftruncate(fd, 0)
    os.lseek(fd, 0, os.SEEK_SET)
    os.write(fd, f"{os.getpid()}\n".encode())


def _read_pid(lock_path: Path) -> str:
    try:
        return lock_path.read_text().strip() or "unknown"
    except OSError:
        return "unknown"
