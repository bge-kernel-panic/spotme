---
id: SPO-14
title: Debug and fix git branch not reverting after exercise ends
status: To Do
assignee: []
created_date: '2026-05-10 13:33'
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
- [ ] #1 After spotme:done/solve/skip, working directory is on the original branch
- [ ] #2 Temp spotme/<unit> branch is deleted after exercise ends
<!-- AC:END -->
