---
id: spo-xz72
status: open
deps: []
links: []
created: 2026-05-10T02:36:41Z
type: feature
priority: 1
assignee: Federico
---
# Implement correct temp-branch lifecycle for reps

Each rep creates a spotme/<unit> branch off the CURRENT branch (not main). Scaffold is committed there. User works unstaged on the temp branch. On rep end (done/solve/skip): switch back to original branch — uncommitted changes follow naturally since the temp branch has no conflicts with original (it only adds the scaffold file). Then DELETE the temp branch. Original branch ends up with the user's solution as unstaged working-tree changes; they commit whenever they want. No stash needed.

