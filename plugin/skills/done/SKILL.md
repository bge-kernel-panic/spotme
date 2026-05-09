---
description: Submit the current Spotter exercise for review.
disable-model-invocation: false
---

# Spotter: Review Submission

The user has finished implementing the exercise.

1. Run `git diff HEAD` via the Bash tool to get their changes.
2. Review the diff:
   - **What they got right** (1–2 sentences, specific)
   - **What's missing or could be better** (concrete — no vague "consider edge cases")
   - **Next steps** — only if implementation is incomplete
3. Do NOT write the solution. Feedback only.
4. If the project has tests: run them scoped to changed files and include the result.
5. Call `mcp__spotter__spotter_exercise` with `action: "deactivate"` to clean up state and switch back to the original branch.
6. Resume the original task.
