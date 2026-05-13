---
id: SPO-21
title: Test and customise SpotMe for Pi
status: To Do
assignee: []
created_date: '2026-05-12 00:02'
updated_date: '2026-05-13 14:58'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
dist/pi.js was removed from the npm build (build script + exports map) to reduce package size from 11.6MB to ~0.9MB. Pi users load src/pi.ts directly via the 'pi.extensions' field in package.json, so dist/pi.js was unused. When starting Pi work, remember to add pi.ts back to the build script if a bundled dist is ever needed.
<!-- SECTION:NOTES:END -->
