from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class WorkspaceInfo:
    path: str
    typecheck_cmd: Optional[str] = None
    test_cmd: Optional[str] = None
    infra_check_cmd: Optional[str] = None
    infra_check_expected: str = "exits 0"


@dataclass
class WorkspaceMap:
    workspaces: dict[str, WorkspaceInfo] = field(default_factory=dict)

    def get_workspaces_for_files(self, files: list[str]) -> list[str]:
        matched = set()
        for f in files:
            for name, ws in self.workspaces.items():
                if f.startswith(ws.path) or f.startswith(ws.path.rstrip("/") + "/"):
                    matched.add(name)
        return sorted(matched)


@dataclass
class SprintStatus:
    stories: dict[str, str] = field(default_factory=dict)
    epics: dict[str, str] = field(default_factory=dict)
    retrospectives: dict[str, str] = field(default_factory=dict)
    story_location: str = ""
    project: str = ""
    raw: dict = field(default_factory=dict, repr=False)

    def get_active_stories(self) -> dict[str, str]:
        return {k: v for k, v in self.stories.items() if v not in ("done", "blocked")}

    def get_done_count(self) -> int:
        return sum(1 for v in self.stories.values() if v == "done")

    def get_blocked_count(self) -> int:
        return sum(1 for v in self.stories.values() if v == "blocked")

    def get_total_count(self) -> int:
        return len(self.stories)

    def is_sprint_complete(self) -> bool:
        return all(v in ("done", "blocked") for v in self.stories.values())


@dataclass
class RunnerState:
    current_story: Optional[str] = None
    retry_count: int = 0
    checkpoint_hash: Optional[str] = None
    started_at: str = ""
    stories_completed: int = 0
    stories_blocked: list[dict] = field(default_factory=list)
    phase: str = ""  # create-story | dev-story | quick-dev | code-review | quality-gate | ""

    def to_dict(self) -> dict:
        return {
            "current_story": self.current_story,
            "retry_count": self.retry_count,
            "checkpoint_hash": self.checkpoint_hash,
            "started_at": self.started_at,
            "stories_completed": self.stories_completed,
            "stories_blocked": self.stories_blocked,
            "phase": self.phase,
        }

    @classmethod
    def from_dict(cls, data: dict) -> RunnerState:
        return cls(
            current_story=data.get("current_story"),
            retry_count=data.get("retry_count", 0),
            checkpoint_hash=data.get("checkpoint_hash"),
            started_at=data.get("started_at", ""),
            stories_completed=data.get("stories_completed", 0),
            stories_blocked=data.get("stories_blocked", []),
            phase=data.get("phase", ""),
        )


@dataclass
class ClaudeResult:
    success: bool = False
    output_text: str = ""
    total_cost_usd: float = 0.0
    duration_ms: int = 0
    stop_reason: str = ""
    is_error: bool = False
    error_messages: list[str] = field(default_factory=list)
    is_budget_exceeded: bool = False
    num_turns: int = 0


@dataclass
class ReviewFindings:
    critical_count: int = 0
    major_count: int = 0
    minor_count: int = 0
    decision_needed_count: int = 0
    has_findings_section: bool = False
    summary: str = ""

    @property
    def is_clean_pass(self) -> bool:
        return self.has_findings_section and self.critical_count == 0 and self.decision_needed_count == 0

    @property
    def needs_human_decision(self) -> bool:
        return self.decision_needed_count > 0 and self.critical_count == 0

    @property
    def has_critical_patches(self) -> bool:
        return self.critical_count > 0
