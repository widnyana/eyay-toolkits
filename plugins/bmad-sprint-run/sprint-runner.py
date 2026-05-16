#!/usr/bin/env python3
"""Autonomous Sprint Orchestrator for BMad-driven development pipelines.

Manages Claude Code as a subprocess, owning state machine transitions,
quality gates, retry logic, and budget tracking. Claude Code (via bmad
skills) handles all git commits. This script does NOT create commits.
"""
from __future__ import annotations

import logging
import os
import signal
import sys
from typing import Optional

# Ensure the script's own directory is on sys.path so `lib/` imports
# resolve regardless of the caller's working directory.
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from lib.claude_cli import (
    build_code_review_prompt,
    build_code_review_system_prompt,
    build_create_story_prompt,
    build_create_story_system_prompt,
    build_dev_story_prompt,
    build_dev_story_system_prompt,
    invoke_claude,
)
from lib.config import Config, parse_args
from lib.lock import sprint_lock
from lib.git_ops import (
    get_current_branch,
    get_current_hash,
    get_diff_files,
    validate_branch,
)
from lib.logger import get_step_logger, log_summary, setup_logging
from lib.models import ClaudeResult, RunnerState, SprintStatus
from lib.state import (
    _filter_candidates,
    append_digest_entry,
    find_story_file,
    get_next_action,
    parse_review_findings,
    read_digest,
    read_runner_state,
    read_sprint_status,
    reset_runner_state,
    update_story_status,
    write_runner_state,
)
from lib.workspace import discover_workspaces, run_quality_gate


def _fmt_cost(usd: float) -> str:
    return f"${usd:.4f}"


def _fmt_duration(ms: int) -> str:
    if ms < 1000:
        return f"{ms}ms"
    return f"{ms / 1000:.1f}s"


class SprintRunner:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.logger = setup_logging(config.log_dir, config.run_id, debug=config.debug)
        self.step_log = get_step_logger(self.logger, "INIT")

        self.sprint_status_path = config.sprint_status_path
        self.runner_state_path = config.runner_state_path
        self.digest_path = config.digest_path

        self.total_cost = 0.0
        self.retry_counts: dict[str, int] = {}  # story_key -> retry count, in-memory
        self.failure_details: dict[str, str] = {}  # story_key -> failure summary

        self.ws_map = discover_workspaces(config.project_root)

    def _log_paths(self) -> None:
        """Print every path the runner resolved, so a run is reproducible
        across machines and surprises (wrong cwd, stale state) are visible."""
        lines = [
            "Resolved paths:",
            f"  script dir:        {_SCRIPT_DIR}",
            f"  working directory: {self.config.project_root}",
            f"  sprint status:     {self.config.sprint_status_path}",
            f"  story directory:   {self.config.story_dir}",
            f"  runner state:      {self.config.runner_state_path}",
            f"  context digest:    {self.config.digest_path}",
            f"  log directory:     {self.config.log_dir}",
            f"  claude binary:     {self.config.claude_path}",
        ]
        for line in lines:
            self.step_log.info("%s", line)

    def run(self) -> int:
        """Main orchestrator loop. Returns exit code."""
        self.step_log.info("Sprint Runner starting")
        self._log_paths()
        self.step_log.info("Branch: %s", get_current_branch(cwd=self.config.project_root))
        self.step_log.info("Workspaces discovered: %s", list(self.ws_map.workspaces.keys()))

        if not self._validate_prerequisites():
            return 1

        if self.config.dry_run:
            return self._dry_run()

        log_summary(self.logger, f"Sprint run started (run_id={self.config.run_id})")

        try:
            with sprint_lock(self.config.project_root):
                exit_code = self._run_locked()
        except RuntimeError as lock_err:
            self.step_log.error("%s", lock_err)
            return 1

        return exit_code

    def _run_locked(self) -> int:
        """Sprint body, called while the process lock is held."""
        exit_code = 0
        try:
            exit_code = self._main_loop()
        except KeyboardInterrupt:
            self.step_log.info("Interrupted by user")
            log_summary(self.logger, "Sprint run interrupted by user")
            exit_code = 130
        except Exception as exc:
            self.step_log.error("Unhandled error: %s", exc, exc_info=True)
            log_summary(self.logger, f"Sprint run failed with error: {exc}")
            exit_code = 1

        self._print_final_summary()
        return exit_code

    def _validate_prerequisites(self) -> bool:
        """Check all prerequisites before starting the loop."""
        if not validate_branch(cwd=self.config.project_root):
            self.step_log.error(
                "Cannot run on main/master branch. Create a feature branch first."
            )
            return False

        try:
            status = read_sprint_status(self.sprint_status_path)
            active = status.get_active_stories()
            self.step_log.info(
                "Sprint loaded: %d stories, %d active, %d done, %d blocked",
                status.get_total_count(),
                len(active),
                status.get_done_count(),
                status.get_blocked_count(),
            )
        except FileNotFoundError:
            self.step_log.error("sprint-status.yaml not found: %s", self.sprint_status_path)
            return False
        except Exception as exc:
            self.step_log.error("Failed to read sprint-status.yaml: %s", exc)
            return False

        return True

    def _dry_run(self) -> int:
        """Resolve and display next action without invoking Claude Code."""
        status = read_sprint_status(self.sprint_status_path)
        action, story_key = get_next_action(
            status,
            target_story=self.config.target_story,
            target_epic=self.config.target_epic,
        )
        self.step_log.info("[DRY RUN] Next action: %s, story: %s", action, story_key or "(none)")
        print(f"Action: {action}")
        print(f"Story:  {story_key or '(sprint complete)'}")
        return 0

    def review_only(self) -> int:
        """Run code review for a single completed story."""
        story_key = self.config.target_story
        if not story_key:
            print("Error: --review requires --story <key>", file=sys.stderr)
            return 1

        # Normalize story key: "4-1" -> match first story starting with "4-1-"
        status = read_sprint_status(self.sprint_status_path)
        matched_key = story_key
        if story_key not in status.stories:
            prefix = story_key if "-" in story_key else f"{story_key}-"
            candidates = [k for k in status.stories if k.startswith(prefix)]
            if len(candidates) == 1:
                matched_key = candidates[0]
            elif len(candidates) > 1:
                print(f"Error: '{story_key}' matches multiple stories: {candidates}", file=sys.stderr)
                return 1
            else:
                print(f"Error: story '{story_key}' not found in sprint-status.yaml", file=sys.stderr)
                return 1

        story_status = status.stories[matched_key]
        if story_status not in ("done", "review", "in-progress"):
            print(f"Error: story {matched_key} is '{story_status}', not done/review/in-progress. Nothing to review.", file=sys.stderr)
            return 1

        step = get_step_logger(self.logger, f"REVIEW-ONLY-{matched_key}")
        step.info("Review-only mode for story %s (status: %s)", matched_key, story_status)

        self._update_phase(matched_key, "code-review")
        ok = self._run_code_review(matched_key, step)

        if ok:
            step.info("Code review passed for %s", matched_key)
            print(f"Review passed: {matched_key}")
        else:
            step.error("Code review found issues for %s", matched_key)
            print(f"Review found issues: {matched_key}")

        return 0

    def _main_loop(self) -> int:
        """Core sprint loop. Returns 0 on success, 1 on failure."""
        max_iterations = 500
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Re-read state from disk every iteration
            try:
                status = read_sprint_status(self.sprint_status_path)
                runner_state = read_runner_state(self.runner_state_path)
            except Exception as exc:
                self.step_log.error("Failed to read state: %s", exc)
                return 1

            # Fix 1: restore persisted retry count for the current story so the
            # retry budget survives process restarts.
            if runner_state.current_story:
                self.retry_counts.setdefault(
                    runner_state.current_story, runner_state.retry_count
                )

            action, story_key = get_next_action(
                status,
                target_story=self.config.target_story,
                target_epic=self.config.target_epic,
            )

            self.step_log.info(
                "Iteration %d: action=%s, story=%s",
                iteration,
                action,
                story_key or "(none)",
            )

            if action == "sprint_complete":
                self._auto_review_done_stories(status)
                self.step_log.info("Sprint complete - all stories resolved")
                log_summary(self.logger, "Sprint complete")
                return 0

            if action == "create_story":
                ok = self._handle_create_story(status, runner_state, story_key)
                if not ok:
                    return 1

            elif action == "preflight":
                ok = self._handle_dev_story(status, runner_state, story_key)
                if not ok:
                    return 1

            elif action == "quality_gate":
                ok = self._handle_review(status, runner_state, story_key)
                if not ok:
                    return 1

            else:
                self.step_log.error("Unknown action: %s", action)
                return 1

        self.step_log.error("Max iterations (%d) reached. Aborting.", max_iterations)
        return 1

    # ------------------------------------------------------------------
    # Story creation
    # ------------------------------------------------------------------

    def _handle_create_story(
        self,
        status: SprintStatus,
        runner_state: RunnerState,
        story_key: str,
    ) -> bool:
        """Invoke Claude Code to create the story file."""
        step = get_step_logger(self.logger, f"CREATE-{story_key}")
        step.info("Creating story %s", story_key)

        self._update_phase(story_key, "create-story")
        prompt = build_create_story_prompt(story_key)
        system = build_create_story_system_prompt(story_key)
        result = self._invoke_claude(prompt, step, system_append=system)

        if not result.success:
            step.error("Story creation failed: %s", result.error_messages)
            return self._handle_invocation_failure(result, story_key, step)

        # Mark story as ready-for-dev after creation
        self._transition_status(story_key, "ready-for-dev", step)
        log_summary(self.logger, f"Story {story_key} created and marked ready-for-dev")
        return True

    # ------------------------------------------------------------------
    # Development (preflight -> implement -> quality gate)
    # ------------------------------------------------------------------

    def _handle_dev_story(
        self,
        status: SprintStatus,
        runner_state: RunnerState,
        story_key: str,
    ) -> bool:
        """Full development cycle: snapshot -> implement -> quality gate."""
        step = get_step_logger(self.logger, f"DEV-{story_key}")
        step.info("Starting development cycle for story %s", story_key)

        # Transition to in-progress
        self._transition_status(story_key, "in-progress", step)

        # Record current HEAD so the quality gate can scope its diff to this
        # story's changes. Not a rollback point — retries fix forward.
        checkpoint_hash = self._snapshot_head(story_key)
        if not checkpoint_hash:
            step.error("Failed to get current HEAD hash")
            return False

        # Update runner state — sync retry_count so the YAML reflects reality
        retry_count = self.retry_counts.get(story_key, 0)
        runner_state.current_story = story_key
        runner_state.checkpoint_hash = checkpoint_hash
        runner_state.retry_count = retry_count
        write_runner_state(self.runner_state_path, runner_state)

        failure = self.failure_details.get(story_key, "")

        if retry_count > 0:
            step.info(
                "Retry attempt %d/%d for story %s",
                retry_count,
                self.config.retry_budget,
                story_key,
            )
        self._update_phase(story_key, "dev-story")
        ok = self._run_dev_story(story_key, retry_count, failure, step)

        if not ok:
            return self._handle_dev_failure(story_key, step)

        # Check that story is now in review state
        fresh_status = read_sprint_status(self.sprint_status_path)
        story_status = fresh_status.stories.get(story_key, "")
        if story_status != "review":
            step.warning(
                "Story is '%s' after implementation (expected 'review'). "
                "Running quality gate anyway.",
                story_status,
            )

        # Run quality gate (typecheck + tests) directly
        self._update_phase(story_key, "quality-gate")
        ok = self._run_quality_gate(story_key, checkpoint_hash, step)
        if not ok:
            return self._handle_dev_failure(story_key, step)

        # Code review (unless skipped)
        if not self.config.skip_code_review:
            self._update_phase(story_key, "code-review")
            ok = self._run_code_review(story_key, step)
            if not ok:
                # Check if blocked for decision_needed (not retriable)
                fresh_status = read_sprint_status(self.sprint_status_path)
                if fresh_status.stories.get(story_key) == "blocked":
                    return True
                return self._handle_dev_failure(story_key, step)

        # Story passed all gates
        self._complete_story(story_key, runner_state, step)
        return True

    def _run_dev_story(
        self,
        story_key: str,
        retry_count: int,
        failure: str,
        step: logging.LoggerAdapter,
    ) -> bool:
        """Invoke Claude Code with /bmad-dev-story."""
        step.info("Invoking /bmad-dev-story for %s", story_key)

        digest = read_digest(self.digest_path)
        prompt = build_dev_story_prompt(story_key, digest)
        system_prompt = build_dev_story_system_prompt(
            story_key, digest, retry_count, self.config.retry_budget, failure,
        )

        result = self._invoke_claude(prompt, step, system_append=system_prompt)

        if not result.success:
            step.error("Dev story failed: %s", result.error_messages)
            return False

        step.info(
            "Dev story completed in %s, cost %s",
            _fmt_duration(result.duration_ms),
            _fmt_cost(result.total_cost_usd),
        )
        return True

    def _run_quality_gate(
        self,
        story_key: str,
        checkpoint_hash: str,
        step: logging.LoggerAdapter,
    ) -> bool:
        """Run typecheck and tests for affected workspaces."""
        step.info("Running quality gate for story %s", story_key)

        changed_files = get_diff_files(checkpoint_hash, cwd=self.config.project_root)
        step.info("Changed files: %s", changed_files)

        affected = self.ws_map.get_workspaces_for_files(changed_files)
        if not affected:
            affected = list(self.ws_map.workspaces.keys())
            step.info("No specific workspace match, running all workspaces defensively")
        else:
            step.info("Affected workspaces: %s", affected)

        passed, failures = run_quality_gate(
            self.ws_map, affected, self.config.project_root,
        )

        if not passed:
            for f in failures:
                step.error("Quality gate failure: %s", f[:500])
            self.failure_details[story_key] = "\n".join(failures)
            log_summary(
                self.logger,
                f"Story {story_key} quality gate FAILED",
            )
            return False

        step.info("Quality gate passed")
        return True

    def _run_code_review(
        self,
        story_key: str,
        step: logging.LoggerAdapter,
    ) -> bool:
        """Invoke Claude Code with /bmad-code-review and parse findings."""
        step.info("Running code review for story %s", story_key)

        prompt = build_code_review_prompt(story_key)
        system = build_code_review_system_prompt(story_key)
        result = self._invoke_claude(prompt, step, system_append=system)

        if not result.success:
            step.error("Code review invocation failed: %s", result.error_messages)
            return True

        # Parse review findings from the story file
        story_file = find_story_file(self.config.story_dir, story_key)
        if not story_file:
            step.warning("Story file not found for review parsing, assuming pass")
            return True

        findings = parse_review_findings(story_file)

        if not findings.has_findings_section:
            step.info("No review findings section found, assuming pass")
            return True

        step.info(
            "Review findings: critical=%d, major=%d, minor=%d, decision_needed=%d",
            findings.critical_count, findings.major_count, findings.minor_count, findings.decision_needed_count,
        )

        if findings.critical_count > 0:
            step.error("Critical findings detected, marking for retry")
            self.failure_details[story_key] = (
                f"Code review found {findings.critical_count} critical, {findings.major_count} major issues. "
                f"Review output:\n{result.output_text[-2000:]}"
            )
            return False

        if findings.decision_needed_count > 0:
            step.warning(
                "Decision needed on %d items. Blocking story for human review.",
                findings.decision_needed_count,
            )
            self._transition_status(story_key, "blocked", step)
            log_summary(
                self.logger,
                f"Story {story_key} BLOCKED - needs human decision",
            )
            return False

        step.info("Code review passed (%d minor findings noted)", findings.minor_count)
        return True

    # ------------------------------------------------------------------
    # Review handling (story already in review state)
    # ------------------------------------------------------------------

    def _handle_review(
        self,
        status: SprintStatus,
        runner_state: RunnerState,
        story_key: str,
    ) -> bool:
        """Handle a story that's already in review state (e.g., after restart)."""
        step = get_step_logger(self.logger, f"REVIEW-{story_key}")
        step.info("Story %s is in review state, running quality gate + code review", story_key)

        checkpoint_hash = self._snapshot_head(story_key)
        if not checkpoint_hash:
            step.error("Failed to get current HEAD hash")
            return False

        # Run quality gate
        ok = self._run_quality_gate(story_key, checkpoint_hash, step)
        if not ok:
            self.retry_counts[story_key] = self.retry_counts.get(story_key, 0) + 1
            if self.retry_counts[story_key] >= self.config.retry_budget:
                self._block_story(story_key, step, "Quality gate failed after max retries")
                return True
            self._transition_status(story_key, "in-progress", step)
            return True

        # Code review
        if not self.config.skip_code_review:
            ok = self._run_code_review(story_key, step)
            if not ok:
                # Check if blocked for decision_needed (not retriable)
                fresh = read_sprint_status(self.sprint_status_path)
                if fresh.stories.get(story_key) == "blocked":
                    return True
                self.retry_counts[story_key] = self.retry_counts.get(story_key, 0) + 1
                if self.retry_counts[story_key] >= self.config.retry_budget:
                    self._block_story(story_key, step, "Code review failed after max retries")
                    return True
                self._transition_status(story_key, "in-progress", step)
                return True

        self._complete_story(story_key, runner_state, step)
        return True

    # ------------------------------------------------------------------
    # Failure handling
    # ------------------------------------------------------------------

    def _handle_dev_failure(
        self,
        story_key: str,
        step: logging.LoggerAdapter,
    ) -> bool:
        """Handle a development failure. Retry (fixing forward) or block.

        Retries never roll back. Any commits the dev cycle produced are kept,
        so the next attempt fixes the existing implementation instead of
        rebuilding it from scratch — the failure detail is fed into the retry
        prompt. A destructive ``git reset --hard`` here previously discarded
        completed, committed work whenever a quality gate false-failed.
        """
        self.retry_counts[story_key] = self.retry_counts.get(story_key, 0) + 1
        retry_count = self.retry_counts[story_key]

        # Persist the updated retry count immediately so restarts honour the budget.
        try:
            rs = read_runner_state(self.runner_state_path)
            rs.retry_count = retry_count
            write_runner_state(self.runner_state_path, rs)
        except Exception as exc:
            step.warning("Could not persist retry_count: %s", exc)

        step.warning(
            "Story %s failed (attempt %d/%d)",
            story_key,
            retry_count,
            self.config.retry_budget,
        )

        if retry_count >= self.config.retry_budget:
            self._block_story(story_key, step, f"Failed after {retry_count} attempts")
            return True  # Continue sprint with other stories

        # Retry: keep all commits, just reset status so the loop re-enters dev.
        self._transition_status(story_key, "in-progress", step)
        log_summary(
            self.logger,
            f"Story {story_key} failed, retrying ({retry_count}/{self.config.retry_budget})",
        )
        return True

    def _handle_invocation_failure(
        self,
        result: ClaudeResult,
        story_key: str,
        step: logging.LoggerAdapter,
    ) -> bool:
        """Handle a Claude invocation failure (CLI error, session error, etc.)."""
        step.error("Claude invocation error: %s", result.error_messages)
        return True

    # ------------------------------------------------------------------
    # State transitions
    # ------------------------------------------------------------------

    def _transition_status(
        self,
        story_key: str,
        new_status: str,
        step: logging.LoggerAdapter,
    ) -> None:
        """Transition a story to a new status in sprint-status.yaml."""
        try:
            update_story_status(self.sprint_status_path, story_key, new_status)
            step.info("Story %s -> %s", story_key, new_status)
        except Exception as exc:
            step.error("Failed to update story status: %s", exc)

    def _complete_story(
        self,
        story_key: str,
        runner_state: RunnerState,
        step: logging.LoggerAdapter,
    ) -> None:
        """Mark a story as done and update digest."""
        self._transition_status(story_key, "done", step)

        # Fresh read so we don't overwrite any fields that _update_phase or
        # _handle_dev_failure may have written since runner_state was loaded.
        fresh = read_runner_state(self.runner_state_path)
        fresh.stories_completed += 1
        fresh.current_story = None
        fresh.checkpoint_hash = None
        fresh.retry_count = 0
        fresh.phase = ""
        write_runner_state(self.runner_state_path, fresh)

        # Append to digest
        digest_entry = (
            f"## Story {story_key} - done\n\n"
            f"Completed successfully. Retry count: {self.retry_counts.get(story_key, 0)}.\n"
        )
        append_digest_entry(self.digest_path, digest_entry, self.config.digest_size)

        log_summary(self.logger, f"Story {story_key} DONE")

        # Clear retry state for this story
        self.retry_counts.pop(story_key, None)
        self.failure_details.pop(story_key, None)

    def _block_story(
        self,
        story_key: str,
        step: logging.LoggerAdapter,
        reason: str,
    ) -> None:
        """Block a story that can't proceed."""
        self._transition_status(story_key, "blocked", step)
        log_summary(self.logger, f"Story {story_key} BLOCKED: {reason}")

        runner_state = read_runner_state(self.runner_state_path)
        runner_state.stories_blocked.append({
            "story": story_key,
            "reason": reason,
        })
        runner_state.phase = ""
        write_runner_state(self.runner_state_path, runner_state)

        # Clear retry state
        self.retry_counts.pop(story_key, None)
        self.failure_details.pop(story_key, None)

    # ------------------------------------------------------------------
    # Phase tracking
    # ------------------------------------------------------------------

    def _update_phase(self, story_key: str, phase: str) -> None:
        """Write current phase to runner-state for crash-recovery inspection.

        Called before every long-running Claude invocation so the file always
        reflects what is happening right now. Non-fatal: a write failure never
        aborts the sprint.
        """
        try:
            state = read_runner_state(self.runner_state_path)
            state.current_story = story_key
            state.phase = phase
            write_runner_state(self.runner_state_path, state)
        except Exception as exc:
            self.step_log.warning("Could not write phase '%s': %s", phase, exc)

    # ------------------------------------------------------------------
    # Git helpers
    # ------------------------------------------------------------------

    def _snapshot_head(self, story_key: str) -> Optional[str]:
        """Record current HEAD hash as the diff base for the quality gate.

        Used only to scope `git diff` to this story's changes. The runner never
        resets to it — failed stories retry by fixing forward.
        """
        try:
            return get_current_hash(cwd=self.config.project_root)
        except Exception as exc:
            self.step_log.error("Failed to get HEAD hash: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Claude invocation wrapper
    # ------------------------------------------------------------------

    def _invoke_claude(
        self,
        prompt: str,
        step: logging.LoggerAdapter,
        system_append: str = "",
    ) -> ClaudeResult:
        """Invoke Claude Code and return result. Cost is tracked for informational logging only."""
        step.info("Prompt:\n%s", prompt)
        if system_append:
            step.info("Injected system prompt (--append-system-prompt):\n%s", system_append)
        else:
            step.info("No system prompt injected for this invocation")
        print(f"\n{'─' * 60}", flush=True)
        result = invoke_claude(
            prompt,
            self.config,
            system_append=system_append,
            cwd=self.config.project_root,
        )
        print(f"{'─' * 60}\n", flush=True)

        self.total_cost += result.total_cost_usd
        step.info(
            "Claude invocation: cost=%s, duration=%s, turns=%d, session_total=%s",
            _fmt_cost(result.total_cost_usd),
            _fmt_duration(result.duration_ms),
            result.num_turns,
            _fmt_cost(self.total_cost),
        )

        return result

    # ------------------------------------------------------------------
    # Auto-review
    # ------------------------------------------------------------------

    def _auto_review_done_stories(self, status: SprintStatus) -> None:
        """Review done stories that haven't been reviewed yet."""
        candidates = _filter_candidates(
            status.stories, self.config.target_story, self.config.target_epic,
        )
        done_stories = [k for k, v in candidates.items() if v == "done"]
        if not done_stories:
            return

        to_review = []
        for story_key in done_stories:
            story_file = find_story_file(self.config.story_dir, story_key)
            if story_file:
                findings = parse_review_findings(story_file)
                if findings.has_findings_section:
                    continue
            to_review.append(story_key)

        if not to_review:
            self.step_log.info("All %d done stories already reviewed", len(done_stories))
            return

        self.step_log.info("Auto-reviewing %d done stories: %s", len(to_review), to_review)
        for story_key in to_review:
            step = get_step_logger(self.logger, f"AUTO-REVIEW-{story_key}")
            self._update_phase(story_key, "code-review")
            ok = self._run_code_review(story_key, step)
            if ok:
                step.info("Auto-review passed for %s", story_key)
            else:
                step.warning("Auto-review found issues for %s", story_key)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def _print_final_summary(self) -> None:
        """Print final summary to console and log."""
        try:
            status = read_sprint_status(self.sprint_status_path)
            runner_state = read_runner_state(self.runner_state_path)
        except Exception:
            status = None
            runner_state = None

        lines = [
            "",
            "=" * 60,
            "SPRINT RUN SUMMARY",
            "=" * 60,
            f"Total cost:   {_fmt_cost(self.total_cost)} (informational)",
            f"Stories done: {status.get_done_count() if status else '?'}",
            f"Stories blocked: {status.get_blocked_count() if status else '?'}",
        ]

        if runner_state and runner_state.stories_blocked:
            lines.append("Blocked stories:")
            for entry in runner_state.stories_blocked:
                lines.append(f"  - {entry.get('story', '?')}: {entry.get('reason', '?')}")

        lines.append("=" * 60)

        summary = "\n".join(lines)
        self.logger.info(summary)


def main() -> int:
    config = parse_args()

    if config.reset:
        try:
            state = reset_runner_state(config.runner_state_path, config.sprint_status_path)
        except Exception as exc:
            print(f"Reset failed: {exc}", file=sys.stderr)
            return 1
        print(f"Runner state reset. {state.stories_completed} stories done, "
              f"next: {state.current_story or '(sprint complete)'}")
        return 0

    if config.watch:
        from lib.log_viewer import watch
        watch(config.project_root, state_path=config.runner_state_path)
        return 0

    runner = SprintRunner(config)

    if config.review_only:
        return runner.review_only()

    # Convert SIGTERM into KeyboardInterrupt so the same cleanup path in run()
    # handles it — and so invoke_claude's except BaseException terminates the
    # Claude Code subprocess before the process exits.
    def _sigterm(_sig: int, _frame: object) -> None:
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, _sigterm)

    return runner.run()


if __name__ == "__main__":
    sys.exit(main())
