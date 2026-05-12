---
id: SPO-21
title: Test and customise SpotMe for Pi
status: To Do
assignee: []
created_date: '2026-05-12 00:02'
labels:
  - testing
dependencies: []
priority: medium
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SpotMe was built and iterated on OpenCode. The Pi harness has a separate implementation in pi.ts that mirrors the OpenCode logic but uses Pi's extension API. Needs end-to-end testing in a Pi project and any Pi-specific adjustments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All commands work in Pi: spotme:on, spotme:off, spotme:status, spotme:done, spotme:hint, spotme:solve, spotme:skip, spotme:rep
- [ ] #2 Counter trigger and exercisePending bypass behave correctly in Pi
- [ ] #3 donePrompt / solvePrompt produce useful review/solution responses in Pi
- [ ] #4 Any Pi-specific UX differences (e.g. select dialog for commands) are evaluated and implemented if worthwhile
<!-- AC:END -->
