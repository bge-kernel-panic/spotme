---
id: SPO-5
title: >-
  Rename all spotter -> spotme (commands, branch prefix, display text, code
  identifiers)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-10 09:24'
updated_date: '2026-05-10 12:07'
labels:
  - chore
dependencies: []
priority: high
ordinal: 5000
---

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. core.ts: rename SpotterState→SpotMeState, fix display text ('Spotter'→'SpotMe'), fix command refs (/spotter:*→/spotme:*)
2. opencode.ts: rename SpotterPlugin→SpotMePlugin, spotter_exercise→spotme_exercise, all command keys, branch prefix spotter/→spotme/, update templates
3. pi.ts: rename SpotterState import, spotter_exercise→spotme_exercise, all command keys, branch prefix, update messages
4. src/index.ts: update export name SpotterPlugin→SpotMePlugin
5. Run typecheck + lint to verify
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed SpotterState→SpotMeState, SpotterPlugin→SpotMePlugin, spotter_exercise→spotme_exercise, all /spotter:* commands→/spotme:*, branch prefix spotter/→spotme/, and all display text 'Spotter'→'SpotMe' across core.ts, opencode.ts, pi.ts, index.ts, and the test wrapper.
<!-- SECTION:FINAL_SUMMARY:END -->
