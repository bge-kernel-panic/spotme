---
id: SPO-1
title: 'Fix spotme:on template to reflect actual parsed args at command run time'
status: To Do
assignee: []
created_date: '2026-05-10 09:24'
labels:
  - bug
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Template interpolates state.difficulty and state.every at init, not at command run time. LLM sees stale defaults.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**2026-05-10T02:36:30Z**

Same root cause as spo-d4u1. The spotme:on command template string is evaluated at init. When user types /spotme:on hard --every 4, the LLM sees 'Difficulty: medium. Every 2 code writes' because the template is already baked. The event handler updates state.every=4 after, but that's too late. Option: convert to a spotme_on tool, or re-read parsed args from the event and dispatch a follow-up message with correct values.
<!-- SECTION:NOTES:END -->
