---
id: SPO-12
title: 'Make spotme:on, spotme:off, spotme:status execute programmatically'
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-10 13:33'
updated_date: '2026-05-11 17:34'
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
- [x] #1 spotme:on activates state without going through the LLM
- [x] #2 spotme:off deactivates state without going through the LLM
- [x] #3 spotme:status displays live state immediately without going through the LLM
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add 'command.execute.before' hook to opencode.ts
2. Handle spotme:on — parse args, update state, push TextPart confirmation
3. Handle spotme:off — update state, push TextPart confirmation
4. Handle spotme:status — push TextPart with statusMessage(state)
5. Remove spotme:off state mutation from event handler (now in execute.before)
6. Keep done/solve/skip git cleanup in event handler
7. Typecheck + lint + build + commit
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferred command.execute.before bypass — toast feedback for on/off is now handled by SpotMeTuiPlugin (command.executed event). LLM round-trip for on/off/status still present but the UX is improved by TUI toasts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added 'command.execute.before' hook that intercepts spotme:on, spotme:off, and spotme:status before they reach the LLM. Each command parses args (on), updates state, and pushes a synthetic TextPart to output.parts — bypassing the LLM entirely. spotme:on also handles git init inline. Removed spotme:off state mutation from the event handler (now handled in execute.before). The event handler now only handles git branch cleanup for done/solve/skip. Imported randomUUID from node:crypto to satisfy ESLint.
<!-- SECTION:FINAL_SUMMARY:END -->
