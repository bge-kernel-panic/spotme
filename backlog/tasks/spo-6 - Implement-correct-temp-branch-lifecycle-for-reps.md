---
id: SPO-6
title: Implement correct temp-branch lifecycle for reps
status: To Do
assignee: []
created_date: '2026-05-10 09:24'
labels:
  - feature
dependencies: []
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Each rep creates a spotme/<unit> branch off the CURRENT branch (not main). Scaffold is committed there. User works unstaged on the temp branch. On rep end (done/solve/skip): switch back to original branch — uncommitted changes follow naturally since the temp branch has no conflicts with original (it only adds the scaffold file). Then DELETE the temp branch. Original branch ends up with the user's solution as unstaged working-tree changes; they commit whenever they want. No stash needed.
<!-- SECTION:DESCRIPTION:END -->
