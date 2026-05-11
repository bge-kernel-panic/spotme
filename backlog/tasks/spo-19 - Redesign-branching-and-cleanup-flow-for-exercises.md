---
id: SPO-19
title: Redesign branching and cleanup flow for exercises
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-11 21:00'
updated_date: '2026-05-11 21:37'
labels:
  - bug
  - refactor
dependencies: []
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move branch creation to tool.execute.before (before scaffold), replace event-based cleanup with explicit spotme_close tool, fix difficulty default in spotme_on schema.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 spotme_on defaults difficulty to medium when not specified
- [x] #2 done/solve/skip templates instruct the LLM to call spotme_close at the end
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix spotme_on schema: add .default('medium') to difficulty enum
2. Add local vars to plugin closure: pendingOriginalBranch (string|null), exercisePending (boolean)
3. Rewrite tool.execute.before:
   - if exercisePending || state.exercise?.active → return (bypass counter for scaffold writes and mid-exercise writes)
   - else: counter logic; on trigger → get current branch (pendingOriginalBranch), git checkout -b spotme/wip-<ts>, exercisePending=true, throw blockedMessage
4. Rewrite spotme_exercise:
   - use pendingOriginalBranch instead of getCurrentBranch()
   - keep wip branch name (no rename needed)
   - git add + commit scaffold
   - exercisePending=false, state.exercise.active=true
5. Add spotme_close tool: git checkout <orig> (carries all uncommitted changes naturally) + git branch -D <temp> + clear state
6. Update done/solve/skip templates to end with 'call spotme_close to finalize'
7. Remove event-based cleanup (pendingCheckout + session.idle handler)
8. typecheck + lint + build
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Abandoned git-branch approach entirely after discovering that git checkout fails when scaffold file has uncommitted modifications ('local changes would be overwritten'). Also git diff HEAD polluted by unrelated uncommitted changes.

New approach: track only filePath in ExerciseState (removed branch/originalBranch). Evaluation reads the live file directly. LLM evaluates what it sees.

Added exercisePending local var to bypass counter for all writes between trigger and spotme_exercise call — handles every=1 and multi-file scaffolds cleanly.

Added spotme_end tool (replaces spotme_close) — called by LLM at end of done/solve/skip templates. Keeps state.exercise alive during LLM's review turn so spotme_status still works.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed all git branch management from the exercise flow.

Root cause: git checkout failed when scaffold file had uncommitted modifications; git diff HEAD was polluted by unrelated changes.

Changes:
- core.ts: dropped branch/originalBranch from ExerciseState; donePrompt/solvePrompt now take filePath instead of diff; added solvePrompt export; SOLVE_PROMPT updated to instruct 'call spotme_status first'
- opencode.ts: added exercisePending flag; added spotme_end tool (clears state + resets counter); removed event-based cleanup; done/solve/skip templates end with 'call spotme_end'; difficulty schema gets .default('medium')
- pi.ts: same exercisePending flag; removed all git helpers; done/solve/skip command handlers clear state and pass filePath to donePrompt/solvePrompt; spotme_exercise verifies file exists via fs.access

Tests: bun run typecheck && bun run lint && bun run build — all clean.
<!-- SECTION:FINAL_SUMMARY:END -->
