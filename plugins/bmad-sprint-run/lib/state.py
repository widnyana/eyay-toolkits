from __future__ import annotations

import os
import re
import tempfile
from datetime import datetime
from typing import Optional

from .models import ReviewFindings, RunnerState, SprintStatus

try:
    from ruamel.yaml import YAML
    _YAML = YAML()
    _YAML.preserve_quotes = True
    _HAS_RUAMEL = True
except ImportError:
    _HAS_RUAMEL = False


def _atomic_write(path: str, content: str) -> None:
    dir_name = os.path.dirname(path) or "."
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp_path, path)
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------------
# Sprint status
# ---------------------------------------------------------------------------

_STORY_PATTERN = re.compile(r"^(\d+)-(\d+)-")
_EPIC_PATTERN = re.compile(r"^epic-(\d+)$")
_RETRO_PATTERN = re.compile(r"^epic-(\d+)-retrospective$")


def _categorize(key: str, status: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Return (story_key, epic_key, retro_key) with at most one set."""
    if _STORY_PATTERN.match(key):
        return key, None, None
    if _EPIC_PATTERN.match(key):
        return None, key, None
    if _RETRO_PATTERN.match(key):
        return None, None, key
    return None, None, None


def _story_sort_key(key: str) -> tuple[int, int]:
    m = _STORY_PATTERN.match(key)
    if not m:
        return (999, 999)
    return (int(m.group(1)), int(m.group(2)))


def read_sprint_status(path: str) -> SprintStatus:
    if not os.path.exists(path):
        raise FileNotFoundError(f"sprint-status.yaml not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if _HAS_RUAMEL:
        raw = _YAML.load(content)
    else:
        import yaml
        raw = yaml.safe_load(content)

    if not isinstance(raw, dict):
        raise ValueError(f"Invalid sprint-status.yaml: expected mapping, got {type(raw).__name__}")

    dev_status = raw.get("development_status", {})
    if not isinstance(dev_status, dict):
        raise ValueError("Invalid sprint-status.yaml: development_status must be a mapping")

    stories: dict[str, str] = {}
    epics: dict[str, str] = {}
    retros: dict[str, str] = {}

    for key, val in dev_status.items():
        sk, ek, rk = _categorize(key, str(val))
        if sk:
            stories[sk] = str(val)
        elif ek:
            epics[ek] = str(val)
        elif rk:
            retros[rk] = str(val)

    return SprintStatus(
        stories=stories,
        epics=epics,
        retrospectives=retros,
        story_location=raw.get("story_location", ""),
        project=raw.get("project", ""),
        raw=raw if _HAS_RUAMEL else dev_status,
    )


def update_story_status(path: str, story_key: str, new_status: str) -> None:
    if _HAS_RUAMEL:
        _update_with_ruamel(path, story_key, new_status)
    else:
        _update_with_text_replace(path, story_key, new_status)


def _update_with_ruamel(path: str, story_key: str, new_status: str) -> None:
    with open(path, "r", encoding="utf-8") as f:
        data = _YAML.load(f.read())

    dev_status = data.get("development_status", {})
    if story_key not in dev_status:
        raise KeyError(f"Story {story_key} not found in sprint-status.yaml")
    dev_status[story_key] = new_status

    import io
    stream = io.StringIO()
    _YAML.dump(data, stream)
    _atomic_write(path, stream.getvalue())


def _update_with_text_replace(path: str, story_key: str, new_status: str) -> None:
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    pattern = re.compile(rf"^(\s*){re.escape(story_key)}\s*:\s*\S+")
    found = False
    for i, line in enumerate(lines):
        m = pattern.match(line)
        if m:
            indent = m.group(1)
            lines[i] = f"{indent}{story_key}: {new_status}\n"
            found = True
            break

    if not found:
        raise KeyError(f"Story {story_key} not found in sprint-status.yaml")

    _atomic_write(path, "".join(lines))


# ---------------------------------------------------------------------------
# Next action resolution
# ---------------------------------------------------------------------------

PRIORITY_ORDER = ["in-progress", "review", "ready-for-dev", "backlog"]


def get_next_action(
    status: SprintStatus,
    target_story: str = "",
    target_epic: str = "",
) -> tuple[str, str]:
    """Return (action, story_key).

    action is one of: create_story, preflight, quality_gate, sprint_complete.
    """
    candidates = _filter_candidates(status.stories, target_story, target_epic)

    for prio in PRIORITY_ORDER:
        matching = [k for k, v in candidates.items() if v == prio]
        if not matching:
            continue
        matching.sort(key=_story_sort_key)
        story_key = matching[0]

        if prio == "backlog":
            return "create_story", story_key
        elif prio in ("ready-for-dev", "in-progress"):
            return "preflight", story_key
        elif prio == "review":
            return "quality_gate", story_key

    return "sprint_complete", ""


def _filter_candidates(
    stories: dict[str, str],
    target_story: str,
    target_epic: str,
) -> dict[str, str]:
    if target_story:
        prefix = target_story if "-" in target_story else target_story + "-"
        return {k: v for k, v in stories.items() if k.startswith(prefix)}

    if target_epic:
        prefix = f"{target_epic}-"
        return {k: v for k, v in stories.items() if k.startswith(prefix)}

    return dict(stories)


# ---------------------------------------------------------------------------
# Runner state
# ---------------------------------------------------------------------------

def read_runner_state(path: str) -> RunnerState:
    if not os.path.exists(path):
        return RunnerState(started_at=datetime.now().isoformat())

    if _HAS_RUAMEL:
        with open(path, "r", encoding="utf-8") as f:
            data = _YAML.load(f.read())
    else:
        import yaml
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f.read())

    if not isinstance(data, dict):
        return RunnerState(started_at=datetime.now().isoformat())

    return RunnerState.from_dict(data)


def write_runner_state(path: str, state: RunnerState) -> None:
    dir_name = os.path.dirname(path) or "."
    os.makedirs(dir_name, exist_ok=True)

    if _HAS_RUAMEL:
        import io
        stream = io.StringIO()
        _YAML.dump(state.to_dict(), stream)
        _atomic_write(path, stream.getvalue())
    else:
        import yaml
        content = yaml.dump(state.to_dict(), default_flow_style=False, sort_keys=False)
        _atomic_write(path, content)


# ---------------------------------------------------------------------------
# Context digest
# ---------------------------------------------------------------------------

def read_digest(path: str) -> str:
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def append_digest_entry(path: str, entry: str, max_entries: int = 5) -> None:
    dir_name = os.path.dirname(path) or "."
    os.makedirs(dir_name, exist_ok=True)

    existing = read_digest(path)
    if not existing:
        existing = "# Sprint Context Digest\n\n"

    existing += entry + "\n"

    # Count entries and prune
    entries = existing.split("## Story ")
    header = entries[0]
    story_entries = entries[1:]

    while len(story_entries) > max_entries:
        story_entries.pop(0)

    if story_entries:
        result = header + "## Story " + "## Story ".join(story_entries)
    else:
        result = existing

    _atomic_write(path, result)


# ---------------------------------------------------------------------------
# Review findings parsing
# ---------------------------------------------------------------------------

def parse_review_findings(story_file_path: str) -> ReviewFindings:
    """Parse review findings from the review section of a story file."""
    if not os.path.exists(story_file_path):
        return ReviewFindings()

    with open(story_file_path, "r", encoding="utf-8") as f:
        content = f.read()

    section_match = re.search(
        r"^(#+)\s*(Review|Findings|AI-Review)",
        content,
        re.MULTILINE | re.IGNORECASE,
    )
    if not section_match:
        return ReviewFindings()

    heading_level = len(section_match.group(1))
    # Scope to just this section: stop at next heading with same or fewer #s.
    next_heading = re.search(
        r"^#{1," + str(heading_level) + r"}\s+\w",
        content[section_match.end():],
        re.MULTILINE,
    )
    if next_heading:
        section_text = content[section_match.start() : section_match.end() + next_heading.start()]
    else:
        section_text = content[section_match.start():]

    return ReviewFindings(
        critical_count=len(re.findall(r"\bcritical\b", section_text, re.IGNORECASE)),
        major_count=len(re.findall(r"\bmajor\b", section_text, re.IGNORECASE)),
        minor_count=len(re.findall(r"\bminor\b", section_text, re.IGNORECASE)),
        decision_needed_count=len(re.findall(r"decision_needed", section_text, re.IGNORECASE)),
        has_findings_section=True,
        findings_text=section_text.strip(),
    )


def find_story_file(story_dir: str, story_key: str) -> Optional[str]:
    """Find the story file in story_dir matching the story key."""
    if not os.path.isdir(story_dir):
        return None

    for fname in os.listdir(story_dir):
        if fname.startswith(story_key) and fname.endswith(".md"):
            return os.path.join(story_dir, fname)
    return None


def reset_runner_state(state_path: str, sprint_status_path: str) -> RunnerState:
    """Rebuild runner state from sprint-status.yaml truth.

    Counts done stories, clears blocked list, resets in-flight fields.
    The next action is resolved from sprint-status so the runner can
    pick up where things actually are.
    """
    status = read_sprint_status(sprint_status_path)

    # Find the next story the runner would work on (first non-done, non-blocked).
    action, next_story = get_next_action(status)

    now = datetime.now().isoformat()
    state = RunnerState(
        current_story=next_story or None,
        retry_count=0,
        checkpoint_hash=None,
        started_at=now,
        stories_completed=status.get_done_count(),
        stories_blocked=[],
        phase="",
    )

    write_runner_state(state_path, state)
    return state
