---
id: SPO-12
title: 'Make spotme:on, spotme:off, spotme:status execute programmatically'
status: To Do
assignee: []
created_date: '2026-05-10 13:33'
labels:
  - feature
dependencies: []
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
These commands currently go through the LLM (prompt → LLM → tool call). They should be intercepted via the 'command.execute.before' hook before they ever reach the model: parse args, update state, return a Part[] result directly. No LLM round-trip needed. Use client or tui toast for feedback. Same for status — should display live state immediately without an LLM call.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 spotme:on activates state without going through the LLM
- [ ] #2 spotme:off deactivates state without going through the LLM
- [ ] #3 spotme:status displays live state immediately without going through the LLM
<!-- AC:END -->
