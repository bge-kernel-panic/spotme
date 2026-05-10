---
id: SPO-7
title: 'Check for git repo on spotme:on, run git init if missing'
status: Done
assignee:
  - '@agent'
created_date: '2026-05-10 09:24'
updated_date: '2026-05-10 12:12'
labels:
  - bug
dependencies: []
priority: medium
ordinal: 7000
---

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
spotme_on (OpenCode) and spotme:on handler (Pi) now run git rev-parse --is-inside-work-tree before enabling. If no repo is found, git init + an empty commit are run automatically and the confirmation message notes '(git repo initialised)'.
<!-- SECTION:FINAL_SUMMARY:END -->
