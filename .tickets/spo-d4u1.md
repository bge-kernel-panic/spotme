---
id: spo-d4u1
status: open
deps: []
links: []
created: 2026-05-10T02:31:19Z
type: bug
priority: 1
assignee: Federico
---
# Fix 'every' setting not applied to trigger threshold

Template bakes in defaults (medium, 2) at plugin init via string interpolation. Even if the event handler updates state.every correctly, the LLM already received the stale template.


## Notes

**2026-05-10T02:36:30Z**

Root cause: command templates use ${state.difficulty}/${state.every} evaluated at plugin load time (makeState() defaults: medium/2). Event handler correctly updates state after command.executed fires, but LLM already received the stale template. Fix: generate template dynamically inside the event handler, or replace template with a spotme_on tool that sets state and returns confirmation.
