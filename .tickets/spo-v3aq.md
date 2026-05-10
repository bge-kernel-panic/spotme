---
id: spo-v3aq
status: closed
deps: []
links: []
created: 2026-05-10T02:31:19Z
type: feature
priority: 2
assignee: Federico
---
# Refactor spotter_exercise: AI writes scaffold via Write tool, tool only takes metadata

AI uses Write tool for scaffold (less TUI noise), then calls spotter_exercise with only {unit, filePath, difficulty} for git ops + state management.


## Notes

**2026-05-10T02:36:30Z**

Detailed flow: AI writes scaffold to file using normal Write tool (lightweight, user sees it, approval-on-write works as preview). Then calls spotter_exercise({unit, filePath, difficulty}) with no scaffold content — plugin reads the file from disk to verify it exists. Tool handles: git checkout -b spotme/<unit> (off current branch), git add + commit scaffold. Edge case: if user has write approval enabled, the Write step serves as a natural preview before the exercise begins.
