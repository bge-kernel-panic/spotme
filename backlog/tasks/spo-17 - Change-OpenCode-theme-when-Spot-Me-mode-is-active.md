---
id: SPO-17
title: Change OpenCode theme when Spot Me mode is active
status: To Do
assignee: []
created_date: '2026-05-10 13:33'
updated_date: '2026-05-12 00:01'
labels:
  - feature
  - blocked
dependencies: []
priority: low
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give the user a visual cue that Spot Me is on. Config type exposes 'theme?: string' settable in the config hook. For runtime switching investigate whether the SDK client can patch config or a TUI event can trigger a theme change. Fallback: inject a coloured banner into the system prompt or TUI prompt area.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When spotme:on activates, OpenCode visually indicates gym mode is active
- [ ] #2 When spotme:off deactivates, the visual indication is removed
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Blocked: OpenCode TUI plugin API is internal-only. The config hook only runs at init, not at runtime. No public API exists for runtime theme switching from a plugin. Revisit when OpenCode exposes a runtime config patch or TUI theme API.
<!-- SECTION:NOTES:END -->
