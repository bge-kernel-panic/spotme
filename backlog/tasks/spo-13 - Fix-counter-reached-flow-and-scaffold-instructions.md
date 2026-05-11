---
id: SPO-13
title: Fix counter-reached flow and scaffold instructions
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-10 13:33'
updated_date: '2026-05-11 18:50'
labels:
  - bug
dependencies: []
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the counter is reached, BLOCKED_REASON tells the LLM to call spotme_exercise, which in turn says to write the scaffold FIRST. Circular and confusing. Fix: BLOCKED_REASON should include the full ordered instruction. Also: if the blocked tool was 'edit' (existing file), the scaffold goes inside that file; if 'write' (new file), create a new file. The SPOT ME marker must use the correct comment syntax for the file's language (e.g. // for JS/TS, # for Python, <!-- --> for HTML).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 BLOCKED_REASON gives a single clear ordered instruction: write scaffold then call spotme_exercise
- [x] #2 Scaffold marker uses language-appropriate comment syntax based on file extension
- [x] #3 If blocked tool was edit, scaffold is placed inside the existing file; if write, a new file is created
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add commentForFile(filePath) helper to core.ts (ext → comment syntax map)
2. Replace BLOCKED_REASON constant with blockedMessage(tool, filePath, difficulty) function
3. Keep BLOCKED_REASON as backward-compat alias for pi.ts
4. Update tool.execute.before in opencode.ts to accept (input, output) and extract output.args.filePath
5. Update pi.ts to use blockedMessage (simplified, no args available)
6. typecheck + lint + build
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced BLOCKED_REASON constant with blockedMessage(toolName, filePath, difficulty) function in core.ts. Added commentForFile() helper with a 30-entry extension→comment-syntax map (C-style, hash, block, double-dash, lisp). blockedMessage now emits three ordered steps: (1) scaffold the file with a language-appropriate marker, (2) call spotme_exercise, (3) display the result verbatim — which also covers SPO-15. Updated tool.execute.before in opencode.ts to accept the output arg and read output.args?.filePath. Updated pi.ts to use isToolCallEventType narrowing to extract event.input.path for write/edit events. BLOCKED_REASON kept as a deprecated alias. typecheck + lint + build all pass.
<!-- SECTION:FINAL_SUMMARY:END -->
