# Spotter

**Gym mode for agentic coding.**

Instead of writing 100% of the code for you, the agent scaffolds a logical unit, hands it off, watches you implement it, and reviews your work before resuming.

> "Keep your edge."

Works with **OpenCode** and **Pi** (and any coding harness that supports SKILL.md skills via the [AgentSkills standard](https://agentskills.io)).

---

## How it works

1. Enable Spotter at the start of a session: `/spotter:on [lite|medium|hard] [--every N]`
2. Every N code-writing actions, the agent scaffolds the next unit instead of completing it
3. You implement the marked section (`# SPOTTER: ...`) directly in your editor
4. `/spotter:done` → agent diffs your work and gives brief, calibrated feedback
5. Agent resumes the original task

---

## Commands

| Command | Description |
|---------|-------------|
| `/spotter:on [lite\|medium\|hard] [--every N]` | Enable gym mode. Default: medium, every 2 |
| `/spotter:off` | Disable — agent writes code normally |
| `/spotter:status` | Show current state |
| `/spotter:rep` | Request an exercise on-demand |
| `/spotter:done` | Submit your implementation for review |
| `/spotter:hint` | Get one targeted hint |
| `/spotter:solve` | Concede — agent completes the exercise |
| `/spotter:skip` | Skip this exercise, no note |

---

## Difficulty levels

| Level | Agent writes | You write |
|-------|-------------|-----------|
| `lite` | Signature + docstring + structure | Just the body |
| `medium` | Signature + `# SPOTTER:` spec comment | All logic |
| `hard` | Plain English spec comment only | Everything |

---

## Install

### OpenCode

Copy or symlink into your project's plugin directory:
```bash
# Project-level
ln -s /path/to/spotter .opencode/plugins/spotter

# Global
ln -s /path/to/spotter ~/.config/opencode/plugins/spotter
```

Or add to `opencode.json` once published to npm:
```json
{ "plugin": ["spotter"] }
```

The `src/opencode.ts` file is the plugin entry point.

### Pi

Copy or symlink into your extensions directory:
```bash
# Project-level
ln -s /path/to/spotter .pi/extensions/spotter

# Global
ln -s /path/to/spotter ~/.pi/agent/extensions/spotter
```

Or install as a Pi package once published:
```bash
pi install npm:spotter
```

The `src/pi.ts` file is the extension entry point. Pi auto-discovers it via the `pi.extensions` field in `package.json`.

### Skill only (any harness that supports AgentSkills)

Copy `SKILL.md` into your harness's skills directory. This gives the prompt layer without the automated tool interception — commands still work, but the counter-based trigger won't fire automatically.

---

## Architecture

Three files:

- **`src/core.ts`** — shared types, state factory, helper functions. Used by both harness integrations.
- **`src/opencode.ts`** — OpenCode plugin. Uses `@opencode-ai/plugin` API: custom tool, command templates, `tool.execute.before` hook.
- **`src/pi.ts`** — Pi extension. Uses `ExtensionAPI`: `pi.registerTool()`, `pi.registerCommand()`, `pi.on("tool_call")`, `pi.sendUserMessage()`.
- **`SKILL.md`** — Prompt layer (harness-agnostic). Tells the agent how to scaffold at each difficulty, when to stop, and how to review diffs.

---

## Development status

**v0.1 — working draft, not yet validated**

Open questions:
- OpenCode: `command.executed` event shape (args parsing may need adjustment)
- Pi: `ctx.cwd` availability in tool/command handlers
- Both: scoped test running after `/spotter:done`
- Both: branch cleanup strategy after review

### Claude Code

Claude Code has a full first-party plugin API (skills, hooks, MCP) that can support Spotter. Not implemented yet — will be added when there's actual demand. PRs welcome.

---

## Name

The agent is your **spotter**. It sets up the lift, stands by while you push, catches you if you call for help. The work is yours.
