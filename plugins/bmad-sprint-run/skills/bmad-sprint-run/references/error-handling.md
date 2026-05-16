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

### HEAD snapshot fails

The checkpoint is a HEAD-hash snapshot, not a commit:

```bash
git rev-parse --verify HEAD
```

If this fails, the repository has no commits or is in a detached/broken state. Print the error and stop — manual intervention is required. Do NOT use `git stash` (it removes untracked bmad artifacts) and never run `git reset`, `git checkout`, `git restore`, or `git clean`.

### Forbidden recovery actions

There is no rollback. The orchestrator never runs `git reset --hard`, `git checkout -- `, `git restore`, `git clean`, or `rm`. A failed story retries by fixing forward on top of its existing commits; an exhausted story is blocked with its commits intact. If git is in a broken state the runner cannot recover from read-only inspection, stop and hand off to a human — never destroy work to "get unstuck".

## sprint-status.yaml is Corrupted

Print the error and stop. Tell the user to run `/bmad-sprint-planning` to regenerate.

## Skill Tool Invocation Fails

1. Print the error.
2. Treat as a retry (go to STEP 6).

## Retry Budget Exhausted

When a story exhausts its retry budget, mark it `blocked` and move on. Nothing is rolled back or deleted — the story's commits stay on the branch for a human to inspect or salvage.

Update `RUNNER_STATE_PATH`:

```yaml
current_story: null
retry_count: 0
checkpoint_hash: null
started_at: [keep existing value]
stories_completed: [keep existing value]
stories_blocked: [append {story_id, reason, retry_count}]
```

Set the story status to `blocked` in `SPRINT_STATUS_PATH`. Both files are edited in place — no file revert occurs, because there is no rollback.

## Quick-Dev Composition Notes

After quick-dev (retry strategy 2) modifies files:
- dev-story on retry 3 may re-implement already-fixed tasks
- Inject explicit context about what quick-dev already changed
- Use `git diff --name-only [checkpoint_hash]` for workspace detection instead of Dev Agent Record
- Quick-dev does not write a Dev Agent Record, so STEP 5a must rely on git diff
