---
id: SPO-3
title: Fix status command to show live state
status: To Do
assignee: []
created_date: '2026-05-10 09:24'
labels:
  - bug
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
statusMessage(state) is called once at plugin init and frozen as a string in the command config. Need a spotme_status tool that reads live state when called.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**2026-05-10T02:36:30Z**

statusMessage(state) returns a string at call time, but cfg.command.template is a static string set once in the config hook — so status is always frozen at init values (off, medium, 2, counter 0/2). Fix: add a spotme_status tool that calls statusMessage(state) dynamically when the LLM invokes it, instead of using a command template.
<!-- SECTION:NOTES:END -->
