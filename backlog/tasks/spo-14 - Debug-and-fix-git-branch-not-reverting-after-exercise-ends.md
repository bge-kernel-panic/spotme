---
id: SPO-14
title: Debug and fix git branch not reverting after exercise ends
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-10 13:33'
updated_date: '2026-05-11 19:56'
labels:
  - bug
dependencies: []
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On done/solve/skip the event handler runs git checkout <original> + git branch -d <temp>. In practice the branch does not revert. Likely cause: (a) event fires after the LLM already ran its own git commands, or (b) the checkout fails silently because there are uncommitted changes and the handler catches the error. Uncommitted changes should carry over to the original branch naturally since the temp branch has no conflicting history.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After spotme:done/solve/skip, working directory is on the original branch
- [x] #2 Temp spotme/<unit> branch is deleted after exercise ends
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace command.executed handler with session.idle listener
2. Keep pendingCheckout local var in plugin closure (set in command.execute.before for done/solve/skip)
3. On session.idle: if pendingCheckout set, clear state.exercise + git checkout <orig> + git branch -D <temp>
4. Use -D (force delete) instead of -d
5. Separate try/catch per git op so checkout failure doesn't block branch delete
6. typecheck + lint + build
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed branch reversion after done/solve/skip by addressing two root causes:

1. **Wrong event timing**: was listening to `command.executed` which fires BEFORE the LLM runs. Replaced with `session.idle` listener (fires after LLM is done), so git diff still works during the review turn.

2. **Silent force-delete failure**: `git branch -d` fails when the temp branch has unmerged commits (always the case). Changed to `git branch -D`.

Changes:
- Added `pendingCheckout` local var in plugin closure; set in `command.execute.before` for done/solve/skip.
- `state.exercise` stays intact during the LLM turn so git diff works; cleared on `session.idle`.
- Separated try/catch for checkout and branch-delete so one failure doesn't block the other.
- `git checkout <orig>` carries uncommitted changes naturally (no conflicting files since scaffold was committed only on temp branch).
<!-- SECTION:FINAL_SUMMARY:END -->
