// Pi extension entry point
// Docs: https://github.com/earendil-works/pi/tree/main/packages/coding-agent#extensions

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { join } from "path";
import {
  type Difficulty,
  type SpotterState,
  makeState,
  parseArgs,
  CODE_WRITE_TOOLS,
  exerciseReadyMessage,
  statusMessage,
  donePrompt,
  HINT_PROMPT,
  SOLVE_PROMPT,
  SKIP_PROMPT,
  BLOCKED_REASON,
} from "./core.js";

const execAsync = promisify(exec);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execAsync(`git ${args.join(" ")}`, { cwd });
  return stdout.trim();
}

export default function (pi: ExtensionAPI) {
  const state: SpotterState = makeState();

  // ─── Tool: spotter_exercise ────────────────────────────────────────────────

  pi.registerTool({
    name: "spotter_exercise",
    label: "Spotter Exercise",
    description:
      "Set up a Spotter coding exercise. Creates a git branch, writes a scaffold with SPOTTER markers, and hands off to the human. Call this instead of writing the implementation directly when Spotter is active.",
    parameters: Type.Object({
      unit: Type.String({ description: "Name of the unit being exercised (e.g. 'UserAuth.login')" }),
      filePath: Type.String({ description: "Relative path to the file to scaffold" }),
      scaffold: Type.String({
        description:
          "The scaffold code. Must include a `# SPOTTER: <description>` marker (or language-appropriate comment) where the human should implement.",
      }),
      difficulty: Type.Union(
        [Type.Literal("lite"), Type.Literal("medium"), Type.Literal("hard")],
        { description: "Difficulty — must match the active session setting" }
      ),
    }),
    async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
      const { unit, filePath, scaffold, difficulty } = params;
      const cwd = ctx.cwd ?? process.cwd();

      let originalBranch: string;
      try { originalBranch = await git(cwd, "branch", "--show-current"); }
      catch { originalBranch = "main"; }

      const safeName = unit.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const branchName = `spotter/${safeName}`;

      try { await git(cwd, "checkout", "-b", branchName); }
      catch { await git(cwd, "checkout", branchName); }

      await writeFile(join(cwd, filePath), scaffold, "utf8");
      await git(cwd, "add", filePath);
      await git(cwd, "commit", "-m", `spotter: scaffold ${unit}`);

      state.exercise = {
        active: true,
        unit,
        filePath,
        branch: branchName,
        originalBranch,
        difficulty: difficulty as Difficulty,
      };
      state.counter = 0;

      const msg = exerciseReadyMessage(unit, filePath, difficulty as Difficulty);
      return { content: [{ type: "text" as const, text: msg }], details: {} };
    },
  });

  // ─── Commands ─────────────────────────────────────────────────────────────

  pi.registerCommand("spotter:on", {
    description: "Enable Spotter gym mode [lite|medium|hard] [--every N]",
    handler: async (args, _ctx) => {
      const parsed = parseArgs(args ?? "", state);
      state.enabled = true;
      state.difficulty = parsed.difficulty;
      state.every = parsed.every;
      state.counter = 0;
      state.exercise = null;
      pi.sendUserMessage(
        `Spotter is now on. Difficulty: ${state.difficulty}, triggering every ${state.every} code write(s). Confirm: "🏋️ Spotter is on." Then continue normally.`
      );
    },
  });

  pi.registerCommand("spotter:off", {
    description: "Disable Spotter gym mode",
    handler: async (_args, _ctx) => {
      state.enabled = false;
      state.exercise = null;
      state.counter = 0;
      pi.sendUserMessage("Spotter is now off. Resume writing code normally. Confirm briefly.");
    },
  });

  pi.registerCommand("spotter:status", {
    description: "Show current Spotter status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(statusMessage(state), "info");
    },
  });

  pi.registerCommand("spotter:done", {
    description: "Submit your implementation for review",
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd ?? process.cwd();
      let diff = "";
      try { diff = await git(cwd, "diff", "HEAD"); }
      catch { diff = "(no diff available)"; }

      if (state.exercise) {
        const orig = state.exercise.originalBranch;
        state.exercise = null;
        state.counter = 0;
        try { await git(cwd, "checkout", orig); } catch { /* ignore */ }
      }

      pi.sendUserMessage(donePrompt(diff));
    },
  });

  pi.registerCommand("spotter:hint", {
    description: "Get a targeted hint for the current exercise",
    handler: async () => { pi.sendUserMessage(HINT_PROMPT); },
  });

  pi.registerCommand("spotter:solve", {
    description: "Concede — let the agent complete the exercise",
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd ?? process.cwd();
      if (state.exercise) {
        const orig = state.exercise.originalBranch;
        state.exercise = null;
        state.counter = 0;
        try { await git(cwd, "checkout", orig); } catch { /* ignore */ }
      }
      pi.sendUserMessage(SOLVE_PROMPT);
    },
  });

  pi.registerCommand("spotter:skip", {
    description: "Skip this exercise with no penalty",
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd ?? process.cwd();
      if (state.exercise) {
        const orig = state.exercise.originalBranch;
        state.exercise = null;
        state.counter = 0;
        try { await git(cwd, "checkout", orig); } catch { /* ignore */ }
      }
      pi.sendUserMessage(SKIP_PROMPT);
    },
  });

  pi.registerCommand("spotter:rep", {
    description: "Request an on-demand Spotter exercise",
    handler: async () => {
      pi.sendUserMessage(
        "The human wants to do an exercise. Call `spotter_exercise` for the next logical unit you were going to implement. Scaffold it and hand off."
      );
    },
  });

  // ─── Hook: intercept code-writing tool calls ──────────────────────────────

  pi.on("tool_call", async (event, _ctx) => {
    if (!state.enabled || state.exercise?.active) return;
    if (!CODE_WRITE_TOOLS.has(event.toolName)) return;

    state.counter++;
    if (state.counter >= state.every) {
      state.counter = 0;
      return {
        block: true,
        reason: BLOCKED_REASON + ` Difficulty: ${state.difficulty}.`,
      };
    }
  });
}
