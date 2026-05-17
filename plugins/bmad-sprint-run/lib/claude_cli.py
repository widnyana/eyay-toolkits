from __future__ import annotations

import ctypes
import json
import logging
import re
import signal as _signal
import subprocess
import sys
import time
from typing import Optional

from .config import Config
from .models import ClaudeResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Question / halt detection
# ---------------------------------------------------------------------------

# Patterns that indicate Claude stopped to ask for human input.
_CONFIRMATION_PATTERNS = re.compile(
    r"(?:"
    r"shall i|should i|do you want|would you like|can i proceed|"
    r"shall we|ready to proceed|ok to continue|"
    r"proceed\?|continue\?|confirm"
    r")",
    re.IGNORECASE,
)

_DECISION_HALT_PATTERNS = re.compile(
    r"(?:"
    r"\bHALT\b|"
    r"reply with your choices?|"
    r"decision needed|"
    r"waiting for your|"
    r"choose (?:an? )?option|"
    r"select an? option|"
    r"pick a number"
    r")",
    re.IGNORECASE,
)

_TAIL_WINDOW = 500


def _detect_pending_question(output_text: str) -> Optional[str]:
    """Check the tail of Claude's output for a pending question or halt.

    Returns the matching text if a question/halt is detected, None otherwise.
    Only inspects the last ~500 characters to avoid false positives from
    legitimate questions in the middle of the output.
    """
    if not output_text:
        return None

    tail = output_text[-_TAIL_WINDOW:].strip()
    if not tail:
        return None

    # Check for confirmation gate: last non-whitespace char is '?'
    if tail.rstrip()[-1:] == "?":
        # Verify it looks like a confirmation request, not a rhetorical question
        # inside analysis text.
        if _CONFIRMATION_PATTERNS.search(tail):
            # Return the last line(s) containing the question
            lines = tail.split("\n")
            for line in reversed(lines):
                line = line.strip()
                if line.endswith("?"):
                    return line
            return tail.split("\n")[-1].strip()

    # Check for decision halt patterns (these don't need to end with '?')
    halt_match = _DECISION_HALT_PATTERNS.search(tail)
    if halt_match:
        # Return surrounding context (the line containing the halt)
        lines = tail.split("\n")
        for line in reversed(lines):
            if _DECISION_HALT_PATTERNS.search(line):
                return line.strip()
        return halt_match.group(0)

    return None


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


def _build_resume_cmd(
    response: str,
    session_id: str,
    config: Config,
) -> list[str]:
    """Build a claude command that resumes an existing session with a response."""
    cmd = [
        config.claude_path,
        "-p", response,
        "--resume", session_id,
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--include-hook-events",
        "--verbose",
        "--dangerously-skip-permissions",
    ]

    if config.effort:
        cmd.extend(["--effort", config.effort])

    if config.model:
        cmd.extend(["--model", config.model])

    if config.allowed_tools:
        cmd.extend(["--allowedTools", *config.allowed_tools])

    return cmd


def _stream_claude_process(
    proc: subprocess.Popen,
) -> tuple[list[str], list[str], float, bool, bool, str, int, Optional[str]]:
    """Read stream-json from a Claude process and return parsed fields.

    Returns (text_parts, error_messages, total_cost, is_error,
             is_budget_exceeded, stop_reason, num_turns, session_id).
    """
    text_parts: list[str] = []
    error_messages: list[str] = []
    total_cost = 0.0
    is_error = False
    is_budget_exceeded = False
    stop_reason = ""
    num_turns = 0
    session_id: Optional[str] = None

    _last_block_text: dict[int, str] = {}
    _tool_seen: set[int] = set()

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
                # Capture session_id from the init event.
                sid = event.get("session_id", "")
                if sid and not session_id:
                    session_id = sid

    except BaseException:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
        raise

    return (
        text_parts, error_messages, total_cost, is_error,
        is_budget_exceeded, stop_reason, num_turns, session_id,
    )


def invoke_claude(
    prompt: str,
    config: Config,
    system_append: str = "",
    cwd: Optional[str] = None,
) -> ClaudeResult:
    """Invoke Claude Code CLI in non-interactive mode and parse stream-json output.

    If Claude stops with a pending question or decision halt, automatically
    resumes the session with an appropriate response up to
    ``config.max_auto_continues`` times.
    """
    cmd = _build_cmd(prompt, config, system_append)

    start_ms = int(time.time() * 1000)

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

    (
        text_parts, error_messages, total_cost, is_error,
        is_budget_exceeded, stop_reason, num_turns, session_id,
    ) = _stream_claude_process(proc)

    proc.wait()

    # -- Auto-continue on pending questions --
    auto_continues = 0
    combined_text = "".join(text_parts)

    while (
        not is_error
        and session_id
        and auto_continues < config.max_auto_continues
    ):
        pending = _detect_pending_question(combined_text)
        if not pending:
            break

        auto_continues += 1
        logger.warning(
            "Auto-continue #%d: detected pending question: %s",
            auto_continues,
            pending[:200],
        )

        # Choose response based on the pattern type.
        if _DECISION_HALT_PATTERNS.search(pending):
            response = (
                "For each decision-needed item, choose the most reasonable "
                "option autonomously using your best engineering judgment. "
                "Document your choices and reasoning. Do NOT ask for further "
                "human input. Proceed immediately."
            )
        else:
            response = (
                "Yes, proceed autonomously with your best judgment. "
                "Do NOT ask for further confirmation."
            )

        resume_cmd = _build_resume_cmd(response, session_id, config)
        sys.stdout.write(f"\n[auto-continue #{auto_continues}]\n")
        sys.stdout.flush()

        try:
            resume_proc = subprocess.Popen(
                resume_cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                bufsize=1,
                preexec_fn=_child_preexec,
            )
        except Exception as exc:
            logger.warning("Auto-continue failed to start: %s", exc)
            break

        (
            cont_text, cont_errors, cont_cost, cont_error,
            cont_budget, cont_reason, cont_turns, cont_sid,
        ) = _stream_claude_process(resume_proc)

        resume_proc.wait()

        # Merge results.
        combined_text += "\n" + "".join(cont_text)
        total_cost += cont_cost
        num_turns += cont_turns
        if cont_error:
            is_error = True
            error_messages.extend(cont_errors)
        if cont_budget:
            is_budget_exceeded = True
        if cont_reason:
            stop_reason = cont_reason
        # Session ID should stay the same, but update if it changed.
        if cont_sid:
            session_id = cont_sid

    if auto_continues > 0:
        logger.info(
            "Auto-continue completed: %d continues, final stop_reason=%s",
            auto_continues, stop_reason,
        )

    duration_ms = int(time.time() * 1000) - start_ms

    return ClaudeResult(
        success=not is_error,
        output_text=combined_text,
        total_cost_usd=total_cost,
        duration_ms=duration_ms,
        stop_reason=stop_reason,
        is_error=is_error,
        error_messages=error_messages,
        is_budget_exceeded=is_budget_exceeded,
        num_turns=num_turns,
        session_id=session_id or "",
        auto_continues=auto_continues,
    )


# ---------------------------------------------------------------------------
# Quality standards injected into every Claude Code subprocess
# ---------------------------------------------------------------------------

_QUALITY_RULES = "\n".join([
    "AUTONOMY (NON-NEGOTIABLE):",
    "- You are running inside an autonomous sprint orchestrator for a BMad methodology sprint.",
    "- There is NO human present to answer questions. The orchestrator has no human to answer you.",
    "- The /bmad-* skills you invoke (bmad-dev-story, bmad-code-review, bmad-create-story) are designed for interactive use with a human.",
    "- OVERRIDE all interactive patterns in those skills: skip confirmation gates, skip decision halt prompts, resolve all choices autonomously.",
    "- NEVER ask questions, confirmations, or clarifications. NEVER use AskUserQuestion or any interactive tool.",
    "- NEVER write text ending with '?' that seeks human input.",
    '- NEVER write "Shall I proceed?", "Should I continue?", "Ready to proceed?", "OK to continue?", or any similar confirmation request.',
    '- NEVER write "HALT" or "Reply with your choices" or ask a human to pick options. If you identify decision-needed items, RESOLVE THEM YOURSELF using your best engineering judgment. Document your choices and reasoning.',
    "- NEVER wait for approval. Proceed immediately with your best judgment.",
    "- If you encounter ambiguity, make a reasonable assumption and document it in your output. Do not stop to ask.",
    "- Asking a question = task failure = wasted budget.",
    "",
    "GIT COMMIT DISCIPLINE (CRITICAL):",
    "- You MUST commit after every logical change. Do NOT accumulate multiple changes without committing.",
    "- After creating or modifying a file, stage it by explicit path and commit IMMEDIATELY.",
    "- NEVER end your turn with uncommitted changes. If you modified files, commit them NOW.",
    "- Stage files by explicit path: `git add path/to/file`. NEVER use `git add -A` or `git add .`.",
    "- Commit messages must be short and descriptive. Format: `fix(scope): description` or `feat(scope): description`.",
    "- Uncommitted work = lost work. The orchestrator may kill your process at any time. COMMIT OFTEN.",
    "",
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
    parts.append("- You MUST commit EACH file as you finish editing it. Do NOT batch multiple files into one commit. Stage by explicit path (`git add path/to/file`), commit immediately. NEVER use `git add -A` or `git add .`.")
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
        "- This is a code review only. Do NOT make code changes or create commits.",
        "- Proceed IMMEDIATELY to the full review. Do NOT summarize scope first and ask for confirmation to proceed.",
        "- If you find decision-needed items, RESOLVE them yourself with your best judgment. Do NOT write 'HALT' or ask a human to choose.",
        "- Complete the entire review in one pass without stopping for human input at any point.",
    ])


def build_auto_fix_prompt(story_key: str, findings_text: str, review_output: str) -> str:
    findings_excerpt = findings_text[:3000] if findings_text else "(see review output below)"
    review_excerpt = review_output[-3000:] if review_output else ""
    return "\n".join([
        f"Auto-fix code review findings for story {story_key}.",
        "",
        "## Review Findings to Fix",
        findings_excerpt,
        "",
        "## Review Output (for context)",
        review_excerpt,
        "",
        "Fix ALL findings listed above. For each finding:",
        "1. Read the relevant source file",
        "2. Apply the fix",
        "3. Commit the fix with a descriptive message referencing the finding",
        "",
        "Do NOT skip any finding. Do NOT ask for confirmation. Fix everything and commit.",
    ])


def build_auto_fix_system_prompt(story_key: str) -> str:
    return "\n".join([
        _QUALITY_RULES,
        "",
        "Sprint Orchestrator Context:",
        f"- Task: Auto-fix code review findings for story {story_key}",
        f"- Story key: {story_key}",
        "- A code review found issues. You must fix ALL of them.",
        "- You MUST commit EACH fix immediately after applying it. Do NOT batch fixes.",
        "- Stage files by explicit path (`git add path/to/file`). NEVER use `git add -A` or `git add .`.",
        "- Commit messages: `fix(scope): description`.",
        "- Do NOT run tests or typecheck — the orchestrator runs quality gates after you finish.",
        "- Do NOT modify sprint-status.yaml, .sprint-runner-state.yaml, or any BMad state files.",
    ])


