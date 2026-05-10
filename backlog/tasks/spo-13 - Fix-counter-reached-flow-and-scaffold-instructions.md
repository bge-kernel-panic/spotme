---
id: SPO-13
title: Fix counter-reached flow and scaffold instructions
status: To Do
assignee: []
created_date: '2026-05-10 13:33'
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
- [ ] #1 BLOCKED_REASON gives a single clear ordered instruction: write scaffold then call spotme_exercise
- [ ] #2 Scaffold marker uses language-appropriate comment syntax based on file extension
- [ ] #3 If blocked tool was edit, scaffold is placed inside the existing file; if write, a new file is created
<!-- AC:END -->
