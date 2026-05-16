from __future__ import annotations

import argparse
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


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

    @property
    def project_root(self) -> str:
        return os.getcwd()


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

    return cfg
