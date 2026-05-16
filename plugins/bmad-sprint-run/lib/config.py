from __future__ import annotations

import argparse
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class Config:
    sprint_status_path: str = "docs/_bmad_output/implementation-artifacts/sprint-status.yaml"
    story_dir: str = "docs/_bmad_output/implementation-artifacts"
    runner_state_path: str = "docs/_bmad_output/implementation-artifacts/.sprint-runner-state.yaml"
    digest_path: str = "docs/_bmad_output/implementation-artifacts/.sprint-context-digest.md"

    retry_budget: int = 3
    digest_size: int = 5

    claude_path: str = "claude"
    log_dir: str = "./sprint-logs"
    skip_code_review: bool = False
    dry_run: bool = False

    target_story: str = ""
    target_epic: str = ""

    effort: str = "high"
    model: str = ""
    allowed_tools: list[str] = field(default_factory=list)
    debug: bool = False
    watch: bool = False
    run_id: str = field(default_factory=lambda: datetime.now().strftime("%Y%m%d-%H%M%S"))

    # Frozen at construction. Captured once so a later os.chdir (ours or a
    # library's) can never invalidate the paths resolved against it.
    project_root: str = field(default_factory=os.getcwd)

    def resolve_paths(self) -> None:
        """Absolutize project_root and every path field anchored to it.

        Called once after argument parsing. After this runs, every path the
        runner touches is a full path, so the values stay valid regardless of
        the working directory or which machine the plugin is installed on.
        """
        root = Path(self.project_root).expanduser().resolve()
        self.project_root = str(root)

        def _abs(value: str) -> str:
            path = Path(value).expanduser()
            if not path.is_absolute():
                path = root / path
            return str(path.resolve())

        self.sprint_status_path = _abs(self.sprint_status_path)
        self.story_dir = _abs(self.story_dir)
        self.runner_state_path = _abs(self.runner_state_path)
        self.digest_path = _abs(self.digest_path)
        self.log_dir = _abs(self.log_dir)


# ---------------------------------------------------------------------------
# sprint-status.yaml discovery
# ---------------------------------------------------------------------------

# Conventional location relative to a project root, as written by
# /bmad-sprint-planning.
_CONVENTIONAL_REL = Path("docs/_bmad_output/implementation-artifacts/sprint-status.yaml")

# Directories never worth descending into during the fallback tree search.
_SKIP_DIRS = {
    "node_modules", "venv", "__pycache__", "target", "dist",
    "build", "vendor", "site-packages",
}

# Cap the fallback search so a deep monorepo cannot turn discovery into a
# full filesystem walk.
_MAX_SEARCH_DEPTH = 6


def _walk_for_file(root: Path, filename: str) -> list[Path]:
    """Return every `filename` under `root`, pruning noise and hidden dirs."""
    found: list[Path] = []
    root_depth = len(root.parts)
    for dirpath, dirnames, filenames in os.walk(root):
        depth = len(Path(dirpath).parts) - root_depth
        if depth >= _MAX_SEARCH_DEPTH:
            dirnames[:] = []
        else:
            dirnames[:] = [
                d for d in dirnames
                if d not in _SKIP_DIRS and not d.startswith(".")
            ]
        if filename in filenames:
            found.append(Path(dirpath) / filename)
    return found


def discover_sprint_status(start: str) -> Optional[Path]:
    """Locate sprint-status.yaml without relying on the caller's cwd.

    The runner may be launched from anywhere inside (or above) a project.
    Discovery proceeds in two stages:

      1. Walk up from `start` to the filesystem root; at each ancestor test
         the conventional docs/_bmad_output/implementation-artifacts path.
      2. If that fails, search downward (bounded depth) from the nearest
         enclosing project root for any sprint-status.yaml living under a
         `_bmad_output` directory.

    Returns the resolved path, or None when nothing is found.
    """
    start_path = Path(start).expanduser().resolve()
    ancestors = [start_path, *start_path.parents]

    # Stage 1: conventional path at each ancestor.
    for base in ancestors:
        candidate = base / _CONVENTIONAL_REL
        if candidate.is_file():
            return candidate.resolve()

    # Stage 2: bounded downward search. Anchor at the highest ancestor that
    # still looks like a project (has .git or docs/), else `start` itself.
    search_root = start_path
    for base in ancestors:
        if (base / ".git").exists() or (base / "docs").is_dir():
            search_root = base

    matches = [
        p for p in _walk_for_file(search_root, "sprint-status.yaml")
        if "_bmad_output" in p.parts
    ]
    if not matches:
        return None

    # Shallowest path wins; sort by string for a deterministic tie-break.
    matches.sort(key=lambda p: (len(p.parts), str(p)))
    return matches[0].resolve()


def parse_args(argv: list[str] | None = None) -> Config:
    parser = argparse.ArgumentParser(
        prog="sprint-runner",
        description="Autonomous Sprint Orchestrator for BMad-driven development pipelines.",
    )

    parser.add_argument("--retry-budget", type=int, default=None,
                        help="Max retry attempts per story (default: 3)")
    parser.add_argument("--skip-code-review", action="store_true", default=False,
                        help="Skip code review step")
    parser.add_argument("--claude-path", type=str, default=None,
                        help="Path to Claude CLI binary (default: claude)")
    parser.add_argument("--log-dir", type=str, default=None,
                        help="Directory for log files (default: ./sprint-logs)")
    parser.add_argument("--dry-run", action="store_true", default=False,
                        help="Resolve next action but do not invoke Claude Code")
    parser.add_argument("--story", type=str, default="",
                        help="Run a specific story only (e.g., 4-1 or 4-1-fan-wallet-masking)")
    parser.add_argument("--epic", type=str, default="",
                        help="Run only stories in the specified epic (e.g., 4)")
    parser.add_argument("--effort", choices=["low", "medium", "high", "xhigh", "max"], default=None,
                        help="Effort level for Claude Code invocations")
    parser.add_argument("--model", type=str, default="",
                        help="Model to use (e.g., sonnet, opus)")
    parser.add_argument("--allowed-tools", type=str, default="",
                        help="Comma-separated list of allowed tools")
    parser.add_argument("--debug", action="store_true", default=False,
                        help="Show sprint-runner debug output on console")
    parser.add_argument("--watch", action="store_true", default=False,
                        help="Watch ~/.claude/projects/ and tail session logs (run in a second terminal)")
    parser.add_argument("--sprint-status-path", type=str, default=None,
                        help="Path to sprint-status.yaml")
    parser.add_argument("--story-dir", type=str, default=None,
                        help="Path to story files directory")
    parser.add_argument("--runner-state-path", type=str, default=None,
                        help="Path to .sprint-runner-state.yaml")
    parser.add_argument("--digest-path", type=str, default=None,
                        help="Path to sprint context digest file")

    args = parser.parse_args(argv)

    cfg = Config()

    # Layer 2: environment variables
    if v := os.environ.get("SPRINT_RETRY_BUDGET"):
        cfg.retry_budget = int(v)
    if v := os.environ.get("SPRINT_CLAUDE_PATH"):
        cfg.claude_path = v
    if v := os.environ.get("SPRINT_LOG_DIR"):
        cfg.log_dir = v

    # Layer 3: CLI arguments (override env vars)
    if args.retry_budget is not None:
        cfg.retry_budget = args.retry_budget
    if args.skip_code_review:
        cfg.skip_code_review = True
    if args.claude_path is not None:
        cfg.claude_path = args.claude_path
    if args.log_dir is not None:
        cfg.log_dir = args.log_dir
    if args.dry_run:
        cfg.dry_run = True
    if args.story:
        cfg.target_story = args.story
    if args.epic:
        cfg.target_epic = args.epic
    if args.effort is not None:
        cfg.effort = args.effort
    if args.model:
        cfg.model = args.model
    if args.allowed_tools:
        cfg.allowed_tools = [t.strip() for t in args.allowed_tools.split(",") if t.strip()]
    if args.debug:
        cfg.debug = True
    if args.watch:
        cfg.watch = True
    if args.sprint_status_path:
        cfg.sprint_status_path = args.sprint_status_path
    if args.story_dir:
        cfg.story_dir = args.story_dir
    if args.runner_state_path:
        cfg.runner_state_path = args.runner_state_path
    if args.digest_path:
        cfg.digest_path = args.digest_path

    # Layer 4: discovery. When the user did not pin --sprint-status-path,
    # locate sprint-status.yaml so the runner works from any cwd. The sibling
    # artifact paths follow the discovered directory unless pinned explicitly.
    if not args.sprint_status_path:
        discovered = discover_sprint_status(cfg.project_root)
        if discovered is not None:
            cfg.sprint_status_path = str(discovered)
            artifacts_dir = discovered.parent
            if not args.story_dir:
                cfg.story_dir = str(artifacts_dir)
            if not args.runner_state_path:
                cfg.runner_state_path = str(artifacts_dir / ".sprint-runner-state.yaml")
            if not args.digest_path:
                cfg.digest_path = str(artifacts_dir / ".sprint-context-digest.md")

    cfg.resolve_paths()
    return cfg
