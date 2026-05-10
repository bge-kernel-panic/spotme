---
id: SPO-2
title: Fix 'every' setting not applied to trigger threshold
status: To Do
assignee: []
created_date: '2026-05-10 09:24'
labels:
  - bug
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Template bakes in defaults (medium, 2) at plugin init via string interpolation. Even if the event handler updates state.every correctly, the LLM already received the stale template.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**2026-05-10T02:36:30Z**

Root cause: command templates use ${state.difficulty}/${state.every} evaluated at plugin load time (makeState() defaults: medium/2). Event handler correctly updates state after command.executed fires, but LLM already received the stale template. Fix: generate template dynamically inside the event handler, or replace template with a spotme_on tool that sets state and returns confirmation.
<!-- SECTION:NOTES:END -->
