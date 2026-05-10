---
id: SPO-15
title: Debug why exerciseReadyMessage is never shown to user
status: To Do
assignee: []
created_date: '2026-05-10 13:33'
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
- [ ] #1 After spotme_exercise runs, the exercise ready message is visible to the user
<!-- AC:END -->
