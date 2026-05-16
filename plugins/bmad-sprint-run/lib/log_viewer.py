from __future__ import annotations

import json
import os
import sys
import time
from typing import Optional


def _get_log_dir(project_root: str) -> str:
    encoded = project_root.replace("/", "-")
    return os.path.expanduser(f"~/.claude/projects/{encoded}")


def _format_event(event: dict) -> Optional[str]:
    """Format a session JSONL event for display. Returns None to suppress.

    Shows: assistant text + tool calls, user text prompts, turn duration, session title.
    Skips: tool_result content, thinking blocks, attachments, permission events.
    """
    etype = event.get("type")

    if etype == "assistant":
        msg = event.get("message")
        if not msg:
            return None
        content = msg.get("content", [])
        if not isinstance(content, list):
            return None
        parts: list[str] = []
        for block in content:
            if not isinstance(block, dict):
                continue
            btype = block.get("type", "")
            if btype == "text":
                text = block.get("text", "").strip()
                if text:
                    parts.append(text)
            elif btype == "tool_use":
                name = block.get("name", "")
                if name:
                    parts.append(f"[{name}]")
            # skip thinking blocks — too verbose
        return "\n".join(parts) if parts else None

    elif etype == "user":
        msg = event.get("message", {})
        content = msg.get("content", "")
        # Only show plain text prompts; skip tool_result blocks
        if isinstance(content, str):
            text = content.strip()
            return f"> {text}" if text else None
        return None

    elif etype == "system":
        if event.get("subtype") == "turn_duration":
            ms = event.get("durationMs", 0)
            return f"[turn: {ms / 1000:.1f}s]"
        return None

    elif etype == "ai-title":
        title = event.get("aiTitle", "")
        return f"[session: {title}]" if title else None

    return None


def _format_state_yaml(raw: str) -> str:
    """Render the runner-state YAML as a compact one-liner for the watch display."""
    # Parse key: value lines into a dict and render compactly
    fields = {}
    for line in raw.splitlines():
        line = line.strip()
        if ":" in line and not line.startswith("-"):
            k, _, v = line.partition(":")
            fields[k.strip()] = v.strip()
    parts = []
    for key in ("current_story", "phase", "retry_count", "stories_completed", "checkpoint_hash"):
        if key in fields and fields[key] not in ("", "null", "''", '""'):
            val = fields[key]
            if key == "checkpoint_hash":
                val = val[:8]  # short hash
            parts.append(f"{key}={val}")
    return "  ".join(parts) if parts else raw.strip()


def watch(
    project_root: str,
    prefix: str = "",
    state_path: Optional[str] = None,
) -> None:
    """Block forever, tailing Claude Code session JSONL files and the runner state YAML.

    Exits on KeyboardInterrupt (Ctrl+C).
    """
    log_dir = _get_log_dir(project_root)

    # Default state YAML path (relative to project_root)
    if state_path is None:
        state_path = os.path.join(
            project_root,
            "docs/_bmad_output/implementation-artifacts/.sprint-runner-state.yaml",
        )

    # Snapshot files that already exist so we only tail sessions started after now
    try:
        known: set[str] = {f for f in os.listdir(log_dir) if f.endswith(".jsonl")}
    except FileNotFoundError:
        known = set()

    watched_file: Optional[str] = None
    pos: int = 0
    state_mtime: float = 0.0

    print(f"Watching {log_dir}", flush=True)
    if os.path.exists(state_path):
        print(f"        {state_path}", flush=True)

    try:
        while True:
            # --- Runner state YAML watcher ---
            try:
                mtime = os.path.getmtime(state_path)
                if mtime != state_mtime:
                    state_mtime = mtime
                    with open(state_path) as f:
                        raw = f.read()
                    summary = _format_state_yaml(raw)
                    sys.stdout.write(f"\n[state] {summary}\n")
                    sys.stdout.flush()
            except (FileNotFoundError, OSError):
                pass

            # --- Session JSONL watcher ---
            try:
                current = {f for f in os.listdir(log_dir) if f.endswith(".jsonl")}
            except FileNotFoundError:
                time.sleep(0.2)
                continue

            new_files = current - known
            if new_files:
                newest = max(
                    new_files,
                    key=lambda f: os.path.getmtime(os.path.join(log_dir, f)),
                )
                if watched_file != newest:
                    watched_file = newest
                    pos = 0
                    print(f"\n--- session: {newest} ---", flush=True)
                known = current

            if watched_file:
                path = os.path.join(log_dir, watched_file)
                try:
                    with open(path) as f:
                        f.seek(pos)
                        while True:
                            line = f.readline()
                            if not line:
                                break
                            pos = f.tell()
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                event = json.loads(line)
                            except json.JSONDecodeError:
                                continue
                            formatted = _format_event(event)
                            if formatted:
                                for out_line in formatted.splitlines():
                                    sys.stdout.write(f"{prefix}{out_line}\n")
                                sys.stdout.flush()
                except (FileNotFoundError, OSError):
                    pass

            time.sleep(0.2)

    except KeyboardInterrupt:
        print("\nWatch stopped.", flush=True)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Tail Claude Code session logs and sprint runner state for a project."
    )
    parser.add_argument(
        "--project-root",
        default=os.getcwd(),
        help="Project root directory (default: cwd)",
    )
    parser.add_argument(
        "--prefix",
        default="",
        help="Line prefix string (default: none)",
    )
    parser.add_argument(
        "--state-path",
        default=None,
        help="Path to .sprint-runner-state.yaml (default: <project-root>/docs/_bmad_output/...)",
    )
    args = parser.parse_args()
    watch(args.project_root, args.prefix, args.state_path)
