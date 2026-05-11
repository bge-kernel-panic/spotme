---
id: SPO-15
title: Debug why exerciseReadyMessage is never shown to user
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-10 13:33'
updated_date: '2026-05-11 18:50'
labels:
  - bug
dependencies: []
priority: high
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
spotme_exercise returns exerciseReadyMessage() as a string, but this output is not visible in the TUI after the tool call. Investigate whether OpenCode displays tool return values, or if the message needs to be injected differently (e.g. via output.parts in a hook, or by having the LLM echo it).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After spotme_exercise runs, the exercise ready message is visible to the user
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Covered by SPO-13: blockedMessage step 3 instructs LLM to display spotme_exercise result verbatim. No separate code change needed.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The exercise ready message is now shown because blockedMessage() step 3 explicitly instructs the LLM to display the full return value of spotme_exercise verbatim. No additional injection mechanism needed — the instruction in the block reason is sufficient.
<!-- SECTION:FINAL_SUMMARY:END -->
