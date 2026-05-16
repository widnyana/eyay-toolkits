"""Tests for sprint-status.yaml discovery in lib.config."""
from __future__ import annotations

from pathlib import Path

from lib.config import discover_sprint_status, parse_args


def _make_status(dir_path: Path) -> Path:
    """Create a minimal sprint-status.yaml at dir_path and return its path."""
    dir_path.mkdir(parents=True, exist_ok=True)
    status = dir_path / "sprint-status.yaml"
    status.write_text("development_status: {}\n")
    return status


# ---------------------------------------------------------------------------
# discover_sprint_status
# ---------------------------------------------------------------------------

def test_finds_conventional_path_at_root(tmp_path):
    status = _make_status(tmp_path / "docs/_bmad_output/implementation-artifacts")
    assert discover_sprint_status(str(tmp_path)) == status.resolve()


def test_finds_conventional_path_from_nested_subdirectory(tmp_path):
    status = _make_status(tmp_path / "docs/_bmad_output/implementation-artifacts")
    sub = tmp_path / "packages" / "api" / "src"
    sub.mkdir(parents=True)
    assert discover_sprint_status(str(sub)) == status.resolve()


def test_falls_back_to_non_conventional_location(tmp_path):
    (tmp_path / ".git").mkdir()
    status = _make_status(tmp_path / "services/_bmad_output/sprint")
    assert discover_sprint_status(str(tmp_path)) == status.resolve()


def test_returns_none_when_absent(tmp_path):
    assert discover_sprint_status(str(tmp_path)) is None


def test_ignores_status_outside_bmad_output(tmp_path):
    (tmp_path / ".git").mkdir()
    _make_status(tmp_path / "random/dir")  # no _bmad_output ancestor
    assert discover_sprint_status(str(tmp_path)) is None


def test_skips_noise_directories(tmp_path):
    (tmp_path / ".git").mkdir()
    _make_status(tmp_path / "node_modules/pkg/_bmad_output/x")
    assert discover_sprint_status(str(tmp_path)) is None


def test_shallowest_match_wins(tmp_path):
    (tmp_path / ".git").mkdir()
    _make_status(tmp_path / "a/b/c/_bmad_output/s")
    shallow = _make_status(tmp_path / "x/_bmad_output/s")
    assert discover_sprint_status(str(tmp_path)) == shallow.resolve()


def test_respects_max_search_depth(tmp_path):
    (tmp_path / ".git").mkdir()
    # _bmad_output sits 7 directory levels deep — past the depth-6 cap.
    _make_status(tmp_path / "l1/l2/l3/l4/l5/l6/l7/_bmad_output/s")
    assert discover_sprint_status(str(tmp_path)) is None


# ---------------------------------------------------------------------------
# parse_args discovery wiring
# ---------------------------------------------------------------------------

def test_parse_args_discovers_status_and_siblings(tmp_path, monkeypatch):
    status = _make_status(tmp_path / "docs/_bmad_output/implementation-artifacts")
    monkeypatch.chdir(tmp_path)

    cfg = parse_args([])

    artifacts = status.parent.resolve()
    assert cfg.sprint_status_path == str(status.resolve())
    assert cfg.story_dir == str(artifacts)
    assert cfg.runner_state_path == str(artifacts / ".sprint-runner-state.yaml")
    assert cfg.digest_path == str(artifacts / ".sprint-context-digest.md")


def test_parse_args_explicit_path_disables_discovery(tmp_path, monkeypatch):
    # A discoverable file exists, but an explicit flag must take precedence.
    _make_status(tmp_path / "docs/_bmad_output/implementation-artifacts")
    monkeypatch.chdir(tmp_path)
    custom = tmp_path / "custom" / "sprint-status.yaml"
    custom.parent.mkdir()
    custom.write_text("development_status: {}\n")

    cfg = parse_args(["--sprint-status-path", str(custom)])

    assert cfg.sprint_status_path == str(custom.resolve())
