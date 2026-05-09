---
description: Activate Spotter gym mode. Starts counting code-writing tool calls and hands off exercises instead of completing them.
disable-model-invocation: false
---

# Spotter: Activate Gym Mode

You are now activating Spotter gym mode.

1. Call `mcp__spotter__spotter_exercise` with `action: "activate"` and the requested difficulty and every-N settings. If the user didn't specify, use `difficulty: "medium"` and `every: 2`.
2. Confirm to the user: "🏋️ Spotter is on. Difficulty: {difficulty}. I'll hand off every {N} code write(s)."
3. Continue with whatever the user was working on — but from now on, when you reach a code-writing action, scaffold it instead of completing it. The hook will remind you when the threshold is hit.

**What changes when Spotter is on:**
- When you would write a file, call `mcp__spotter__spotter_exercise` instead (with action: "exercise")
- The scaffold must include a `# SPOTTER: <spec>` marker where the user implements
- After calling the tool: stop. Output only "Your turn." Then wait.
