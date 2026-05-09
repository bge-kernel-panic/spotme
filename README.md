# opencode-spotter

**Gym mode for agentic coding.**

Spotter turns OpenCode into an active learning tool. Instead of writing 100% of the code for you, the agent scaffolds a logical unit, hands it off, watches you implement it, and reviews your work before resuming.

> "Keep your edge."

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

### Local (project-level)

```bash
cp -r . /your-project/.opencode/plugins/spotter
```

Or symlink:
```bash
ln -s /path/to/spotter /your-project/.opencode/plugins/spotter
```

### Global

```bash
cp -r . ~/.config/opencode/plugins/spotter
```

### From npm (once published)

Add to your `opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-spotter"]
}
```

---

## Architecture

Two layers:

- **`src/index.ts`** — TypeScript plugin. Registers `spotter_exercise` custom tool, intercepts code-writing tool calls, manages session state, handles git branching and diff on submit.
- **`SKILL.md`** — Prompt layer. Tells the agent when to call `spotter_exercise`, how to write scaffolds at each difficulty, and how to review submitted diffs.

---

## Development status

**v0.1 — working draft**

Known open questions:
- `tui.prompt.append` / `tui.toast.show` button support needs live testing
- Test suite detection and scoped test running
- Branch cleanup strategy after review
- `command.executed` event shape (args parsing may need adjustment after dogfooding)

---

## Name

The agent is your **spotter**. It sets up the lift, stands by while you push, catches you if you call for help. The work is yours.
