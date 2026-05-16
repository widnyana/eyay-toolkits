# Error Handling Reference

Detailed error handling procedures for the sprint runner orchestration loop.

## Dev-Story Crashes or Produces No Output

1. Check if the story file is valid (has Tasks/Subtasks section).
2. Check if the story status was updated.
3. If status is still `ready-for-dev`: treat as a retry (go to STEP 6).
4. If status is `in-progress`: the skill was interrupted; re-invoke dev-story.

## Code-Review Produces No Findings

1. Verify the story file has a review findings section (look for headings matching `Review`, `Findings`, or `AI-Review`).
2. If missing: treat as a skill failure (go to STEP 6).
3. Never assume zero findings means clean pass without verification.

## Git Operations Fail

### Checkpoint commit fails

Stage all changes explicitly and retry:

```bash
git add -A
git commit -m "checkpoint: pre-story [STORY_ID]" --allow-empty
```

Do NOT use `git stash` -- it removes untracked bmad artifacts from the working tree.

### Rollback fails

Print the error and stop. Manual intervention required.

### Verification

Always verify checkpoint commit succeeded before proceeding:

```bash
git rev-parse --verify HEAD
```

## sprint-status.yaml is Corrupted

Print the error and stop. Tell the user to run `/bmad-sprint-planning` to regenerate.

## Skill Tool Invocation Fails

1. Print the error.
2. Treat as a retry (go to STEP 6).

## Retry Budget Exhausted - Post-Rollback State Recovery

After `git reset --hard [checkpoint_hash]`, all files on disk revert to the checkpoint state. This includes `RUNNER_STATE_PATH` and `SPRINT_STATUS_PATH`. The orchestrator MUST explicitly rewrite these files with correct post-rollback values:

```yaml
# RUNNER_STATE_PATH after rollback
current_story: null
retry_count: 0
checkpoint_hash: null
started_at: [keep existing value]
stories_completed: [keep existing value]
stories_blocked: [append {story_id, reason, retry_count}]
```

Also override the story status to `blocked` in `SPRINT_STATUS_PATH` since the rollback restored its previous status.

## Quick-Dev Composition Notes

After quick-dev (retry strategy 2) modifies files:
- dev-story on retry 3 may re-implement already-fixed tasks
- Inject explicit context about what quick-dev already changed
- Use `git diff --name-only [checkpoint_hash]` for workspace detection instead of Dev Agent Record
- Quick-dev does not write a Dev Agent Record, so STEP 5a must rely on git diff
