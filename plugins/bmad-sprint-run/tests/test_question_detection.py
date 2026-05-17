"""Tests for _detect_pending_question in lib.claude_cli."""

import sys
from pathlib import Path

# Ensure plugin root is on sys.path.
_PLUGIN_ROOT = Path(__file__).resolve().parent.parent
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from lib.claude_cli import _detect_pending_question


def test_no_question():
    assert _detect_pending_question("Here is my work. All done.") is None


def test_empty_output():
    assert _detect_pending_question("") is None


def test_whitespace_only():
    assert _detect_pending_question("   \n  \t  ") is None


def test_question_in_middle_not_at_end():
    text = "What about X? Let me check. Done."
    assert _detect_pending_question(text) is None


def test_confirmation_shall_i():
    text = (
        "I've reviewed the code changes. Here's a summary:\n"
        "- 13 files changed\n"
        "- 550 lines added\n\n"
        "Shall I proceed with the review?"
    )
    result = _detect_pending_question(text)
    assert result is not None
    assert "Shall I proceed" in result


def test_confirmation_should_i():
    text = "I found some issues. Should I continue with the fix?"
    result = _detect_pending_question(text)
    assert result is not None
    assert "Should I continue" in result


def test_confirmation_ready_to_proceed():
    text = "Scope identified. Ready to proceed?"
    result = _detect_pending_question(text)
    assert result is not None


def test_confirmation_would_you_like():
    text = (
        "I've analyzed the changes.\n"
        "Would you like me to proceed with the adversarial review?"
    )
    result = _detect_pending_question(text)
    assert result is not None


def test_decision_halt():
    text = (
        "### Resolve Decision-Needed Findings\n\n"
        "**DN1:** Some issue\n\n"
        "**HALT** -- Reply with your choices (e.g., 'DN1: 1, DN2: 2')."
    )
    result = _detect_pending_question(text)
    assert result is not None
    assert "HALT" in result


def test_decision_halt_reply_with_choices():
    text = (
        "I've identified 3 decision-needed items.\n\n"
        "Reply with your choices."
    )
    result = _detect_pending_question(text)
    assert result is not None


def test_decision_needed_header():
    text = (
        "### Findings\n\n"
        "Some findings here.\n\n"
        "Decision Needed (3)"
    )
    result = _detect_pending_question(text)
    assert result is not None


def test_question_at_very_end_of_long_output():
    prefix = "x" * 1000
    text = prefix + "\n\nShall I proceed with the adversarial review?"
    result = _detect_pending_question(text)
    assert result is not None
    assert "Shall I proceed" in result


def test_tool_markers_only():
    text = "[Bash]\n[Read]\n[Grep]\n[Agent]\n"
    assert _detect_pending_question(text) is None


def test_false_positive_code_question_mark():
    text = (
        "The function signature is:\n"
        "function verify(token: string): boolean\n\n"
        "Code review complete. No issues found."
    )
    assert _detect_pending_question(text) is None


def test_rhetorical_question_not_at_end():
    text = (
        "What does this function do? It validates the token.\n"
        "Let me check the implementation.\n\n"
        "Code review complete."
    )
    assert _detect_pending_question(text) is None


def test_halt_with_dn_options():
    text = (
        "Options:\n"
        "1. Soft-delete (tombstone)\n"
        "2. Blocklist table\n"
        "3. Accept current behavior\n\n"
        "HALT -- Reply with your choices (e.g., 'DN1: 1, DN2: 1, DN3: 2')."
    )
    result = _detect_pending_question(text)
    assert result is not None
    assert "HALT" in result
