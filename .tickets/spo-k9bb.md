---
id: spo-k9bb
status: open
deps: []
links: []
created: 2026-05-10T02:31:19Z
type: bug
priority: 2
assignee: Federico
---
# Fix spotme:done command — simplify convoluted template

Current template embeds full donePrompt() output with a literal '<diff from above>' placeholder. Should be simpler: tell LLM to run git diff HEAD and then review the impl.


## Notes

**2026-05-10T02:36:30Z**

Current template embeds the full donePrompt() output with a literal '<diff from above>' placeholder — the LLM sees nested instructions telling it to run git diff and substitute into a pre-written review structure. Pi's implementation is cleaner: the handler runs git diff itself and passes the real diff to donePrompt(). On OpenCode, fix by creating a spotme_done tool that computes the diff, clears exercise state, switches branch, and returns the review prompt — same pattern as Pi.
