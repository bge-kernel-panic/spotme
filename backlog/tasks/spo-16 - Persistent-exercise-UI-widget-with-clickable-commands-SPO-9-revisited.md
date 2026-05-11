---
id: SPO-16
title: Persistent exercise UI widget with clickable commands (SPO-9 revisited)
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-10 13:33'
updated_date: '2026-05-11 16:47'
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
- [x] #1 While exercise is active a UI panel shows the 4 available actions
- [x] #2 Clicking an action in the panel executes the corresponding spotme command
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Install @opentui/* devDeps for types
2. Add SpotMeTuiPlugin named export to opencode.ts
3. Listen session.next.tool.called/success to detect spotme_exercise
4. Show DialogSelect when exercise starts (hint/done/solve/skip)
5. appendPrompt + submitPrompt on selection
6. Toast on command.executed for spotme:on/off
7. Export from index.ts and test plugin shim
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added SpotMeTuiPlugin named export to opencode.ts. The TUI plugin:
- Tracks spotme_exercise tool calls via session.next.tool.called event
- Shows a DialogSelect (hint/done/solve/skip) when the tool succeeds
- appendPrompt + submitPrompt sends the selected slash command automatically
- Shows success/info toasts when spotme:on / spotme:off commands execute
- Installed @opentui/core @opentui/solid @opentui/keymap as devDeps for types
- Exported SpotMeTuiPlugin from index.ts and updated test shim

Pivoted implementation: TUI plugin API is not available to external plugins (internal-only). Instead, exerciseReadyMessage now includes an AGENT instruction to immediately call OpenCode's built-in question tool with Hint/Done/Solve/Skip options. The agent calls it, the question dialog appears, the user clicks, and the agent maps the selection to the corresponding /spotme:* command. Removed SpotMeTuiPlugin export and @opentui/* devDeps.
<!-- SECTION:FINAL_SUMMARY:END -->
