---
id: SPO-4
title: 'Scaffold write flow: plugin reads file from disk instead of receiving content'
status: To Do
assignee: []
created_date: '2026-05-10 09:24'
labels:
  - feature
dependencies: []
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AI writes scaffold using the normal Write tool first (file exists on disk). Then calls spotter_exercise with only {unit, filePath, difficulty} — no scaffold field. Plugin reads the file from disk (Bun.file) to confirm it exists before branching + committing. Makes the tool call lightweight (no large string payload). Only edge case: user has auto-write approval enabled — in that case the Write step acts as a natural preview before the exercise locks in, which is actually desirable.
<!-- SECTION:DESCRIPTION:END -->
