---
id: SPO-22
title: 'Refactor: extract SpotMe engine + platform adapter pattern'
status: Done
assignee:
  - '@wtfzambo'
created_date: '2026-05-12 20:07'
updated_date: '2026-05-12 20:07'
labels:
  - refactor
dependencies: []
priority: high
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Consolidate duplicated logic between opencode.ts and pi.ts into a shared SpotMeEngine class. All prompts in one file, types in another, adapters are thin wiring layers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SpotMeEngine class owns all state and logic
- [x] #2 PlatformAdapter interface: resolvePath + fileExists only
- [x] #3 All prompt templates consolidated in prompts.ts (PROMPTS object)
- [x] #4 opencode.ts and pi.ts are thin adapters delegating to engine
- [x] #5 core.ts deleted, no dead exports
- [x] #6 typecheck + lint + build pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted shared SpotMeEngine class with PlatformAdapter interface pattern.

Structure:
- types.ts: Difficulty, ExerciseState, SpotMeState, CODE_WRITE_TOOLS, parseArgs
- prompts.ts: all display messages + LLM instruction templates (PROMPTS object)
- engine.ts: SpotMeEngine class (state, counter, exercise lifecycle, write interception)
- opencode.ts: thin adapter wiring engine to OpenCode plugin API
- pi.ts: thin adapter wiring engine to Pi extension API
- core.ts: deleted

Key design: PlatformAdapter interface requires only resolvePath() and fileExists(). Engine is platform-agnostic. Adding a new editor adapter means implementing those two methods.
<!-- SECTION:FINAL_SUMMARY:END -->
