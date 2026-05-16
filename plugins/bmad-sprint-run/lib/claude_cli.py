from __future__ import annotations

import ctypes
import json
import signal as _signal
import subprocess
import sys
import time
from typing import Optional

from .config import Config
from .models import ClaudeResult


def _child_preexec() -> None:
    """Ask kernel to deliver SIGTERM to this process when its parent dies (Linux only).

    PR_SET_PDEATHSIG ensures Claude Code is terminated even if the parent is
    SIGKILL'd (OOM killer, `kill -9`) — a case no Python signal handler can cover.
    """
    try:
        PR_SET_PDEATHSIG = 1
        libc = ctypes.CDLL("libc.so.6", use_errno=True)
        libc.prctl(PR_SET_PDEATHSIG, _signal.SIGTERM, 0, 0, 0)
    except Exception:
        pass


def _build_cmd(
    prompt: str,
    config: Config,
    system_append: str = "",
) -> list[str]:
    cmd = [
        config.claude_path,
        "-p", prompt,
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--include-hook-events",
        "--verbose",
        "--dangerously-skip-permissions",
    ]

    if system_append:
        cmd.extend(["--append-system-prompt", system_append])

    if config.effort:
        cmd.extend(["--effort", config.effort])

    if config.model:
        cmd.extend(["--model", config.model])

    if config.allowed_tools:
        cmd.extend(["--allowedTools", *config.allowed_tools])

    return cmd


def invoke_claude(
    prompt: str,
    config: Config,
    system_append: str = "",
    cwd: Optional[str] = None,
) -> ClaudeResult:
    """Invoke Claude Code CLI in non-interactive mode and parse stream-json output."""
    cmd = _build_cmd(prompt, config, system_append)

    start_ms = int(time.time() * 1000)
    text_parts: list[str] = []
    error_messages: list[str] = []
    total_cost = 0.0
    is_error = False
    is_budget_exceeded = False
    stop_reason = ""
    num_turns = 0

    # Streaming display state: track printed chars per block to emit deltas only
    _last_block_text: dict[int, str] = {}
    _tool_seen: set[int] = set()

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
            preexec_fn=_child_preexec,
        )
    except FileNotFoundError:
        return ClaudeResult(
            success=False,
            is_error=True,
            error_messages=[f"Claude CLI not found: {config.claude_path}"],
            stop_reason="cli_not_found",
        )
    except Exception as exc:
        return ClaudeResult(
            success=False,
            is_error=True,
            error_messages=[f"Invocation error: {exc}"],
            stop_reason="invocation_error",
        )

    try:
        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue

            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type", "")

            if event_type == "assistant":
                msg = event.get("message", {})
                content = msg.get("content", [])

                # Detect turn boundary: first text block is shorter than last seen
                if (
                    content
                    and isinstance(content[0], dict)
                    and content[0].get("type") == "text"
                ):
                    cur_len = len(content[0].get("text", ""))
                    if cur_len < len(_last_block_text.get(0, "")):
                        sys.stdout.write("\n")
                        sys.stdout.flush()
                        _last_block_text.clear()
                        _tool_seen.clear()

                for idx, block in enumerate(content):
                    if not isinstance(block, dict):
                        continue
                    btype = block.get("type", "")

                    if btype == "text":
                        full = block.get("text", "")
                        prev = _last_block_text.get(idx, "")
                        delta = full[len(prev):]
                        if delta:
                            sys.stdout.write(delta)
                            sys.stdout.flush()
                        _last_block_text[idx] = full
                        text_parts.append(full)

                    elif btype == "tool_use" and idx not in _tool_seen:
                        _tool_seen.add(idx)
                        sys.stdout.write(f"\n[{block.get('name', '')}]\n")
                        sys.stdout.flush()

                num_turns += 1

            elif event_type == "result":
                subtype = event.get("subtype", "")
                stop_reason = subtype
                total_cost = float(event.get("total_cost_usd", 0.0))
                sys.stdout.write(f"\n[result: {subtype} | cost=${total_cost:.4f}]\n")
                sys.stdout.flush()

                if subtype == "error_max_budget_usd":
                    is_budget_exceeded = True
                    is_error = True
                    error_messages.append("Budget exceeded for invocation")
                elif subtype in ("error", "error_tool"):
                    is_error = True
                    err_text = event.get("error", "")
                    if err_text:
                        error_messages.append(str(err_text))

            elif event_type == "system":
                pass  # init events, ignore

    except BaseException:
        # Ctrl+C, SIGTERM converted to SystemExit, or any other interrupt.
        # Terminate Claude Code before re-raising so it doesn't run unmanaged.
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
        raise

    proc.wait()

    duration_ms = int(time.time() * 1000) - start_ms

    return ClaudeResult(
        success=not is_error,
        output_text="".join(text_parts),
        total_cost_usd=total_cost,
        duration_ms=duration_ms,
        stop_reason=stop_reason,
        is_error=is_error,
        error_messages=error_messages,
        is_budget_exceeded=is_budget_exceeded,
        num_turns=num_turns,
    )


# ---------------------------------------------------------------------------
# Quality standards injected into every Claude Code subprocess
# ---------------------------------------------------------------------------

_QUALITY_RULES = "\n".join([
    "Quality Standards (NON-NEGOTIABLE):",
    "- Do NOT cut corners or take shortcuts",
    "- Do NOT find easy fixes — find correct fixes",
    "- Do NOT chase easy wins — implement features properly and completely",
    "- Follow high-quality software engineering standards at all times",
    "- Every function must work as specified — start it, finish it",
    "- No partial features, no TODO stubs for core logic",
])


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def build_create_story_prompt(story_key: str) -> str:
    return f"Create story {story_key} for the current sprint.\n/bmad-create-story"


def build_create_story_system_prompt(story_key: str) -> str:
    return "\n".join([
        _QUALITY_RULES,
        "",
        "Sprint Orchestrator Context:",
        f"- Task: Create story file for {story_key}",
        f"- Story key: {story_key}",
        "- Commit your work in small, frequent increments — one commit per logical chunk as you complete it. Do not wait until the end or batch many changes into one large commit. Stage files by explicit path, never use 'git add -A' or 'git add .'.",
    ])


def build_dev_story_prompt(story_key: str, digest_summary: str) -> str:
    return f"Implement story {story_key}.\n/bmad-dev-story"


def build_dev_story_system_prompt(
    story_key: str,
    digest_summary: str,
    retry_count: int,
    retry_budget: int,
    failure_details: str,
) -> str:
    parts = [
        _QUALITY_RULES,
        "",
        "Sprint Orchestrator Context:",
        f"- Task: Implement story {story_key}",
        f"- Story key: {story_key}",
    ]
    if digest_summary:
        parts.append(f"- Recent sprint context:\n{digest_summary[:2000]}")
    if retry_count > 0:
        parts.append(f"- Retry attempt: {retry_count}/{retry_budget}")
    if failure_details:
        parts.append(f"- Previous failures: {failure_details}")
    parts.append("- Commit your work in small, frequent increments — one commit per logical chunk as you complete it. Do not wait until the end or batch many changes into one large commit. Stage files by explicit path, never use 'git add -A' or 'git add .'.")
    return "\n".join(parts)


def build_code_review_prompt(story_key: str) -> str:
    return f"Review the code changes for story {story_key}.\n/bmad-code-review"


def build_code_review_system_prompt(story_key: str) -> str:
    return "\n".join([
        _QUALITY_RULES,
        "",
        "Sprint Orchestrator Context:",
        f"- Task: Review code changes for story {story_key}",
        f"- Story key: {story_key}",
        "- Commit your work in small, frequent increments — one commit per logical chunk as you complete it. Do not wait until the end or batch many changes into one large commit. Stage files by explicit path, never use 'git add -A' or 'git add .'.",
    ])


