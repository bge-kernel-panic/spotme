---
id: SPO-20
title: Fix counter reset timing for solve/skip
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-11 22:51'
updated_date: '2026-05-11 22:54'
labels:
  - bug
dependencies: []
priority: high
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When /solve or /skip is called, spotme_end currently resets the counter to 0 immediately. The LLM's resume writes in the same turn then count from 0 and can re-trigger a new exercise mid-turn. Counter should only start ticking after the LLM's current turn ends.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Writes made in the same LLM turn as solve/skip are bypassed (do not count toward next exercise)
- [x] #2 Counter starts from 0 on the NEXT turn after solve/skip
- [x] #3 Normal exercise trigger flow (separate turn) is unaffected
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add graceAfterClose local flag (separate from exercisePending which is for scaffold-write bypass)
2. In tool.execute.before: bypass when graceAfterClose is true
3. In spotme_end: set graceAfterClose=true instead of exercisePending
4. Add event hook: on session.idle, clear graceAfterClose (ends grace period)
5. typecheck + lint + build
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added graceAfterClose flag to opencode.ts.

After spotme_end is called, graceAfterClose=true bypasses all write tool calls for the rest of the LLM turn. When the session goes idle (session.idle event), graceAfterClose is cleared and the counter starts from 0 for the next turn.

Changes:
- opencode.ts: graceAfterClose local var; spotme_end sets it to true; tool.execute.before checks it; session.idle event handler clears it; spotme:on and spotme_on tool also clear it on full reset

No changes needed for pi.ts — Pi command handlers already clear state synchronously before sending the LLM message, so the LLM writes happen in a separate turn and naturally don't count.
<!-- SECTION:FINAL_SUMMARY:END -->
