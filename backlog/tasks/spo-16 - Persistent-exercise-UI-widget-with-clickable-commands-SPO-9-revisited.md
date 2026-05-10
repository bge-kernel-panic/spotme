---
id: SPO-16
title: Persistent exercise UI widget with clickable commands (SPO-9 revisited)
status: To Do
assignee: []
created_date: '2026-05-10 13:33'
labels:
  - feature
dependencies: []
priority: medium
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
While an exercise is active, show a persistent graphical panel listing the available commands: hint, solve, skip, done. The user clicks to execute. Plugin API has 'command.execute.before' and Part[] output; investigate if TUI events or Part types can render a persistent widget. May require upstream OpenCode support.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 While exercise is active a UI panel shows the 4 available actions
- [ ] #2 Clicking an action in the panel executes the corresponding spotme command
<!-- AC:END -->
