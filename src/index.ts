import { type Plugin, tool } from "@opencode-ai/plugin";

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = "lite" | "medium" | "hard";

interface ExerciseState {
  active: boolean;
  unit: string;
  filePath: string;
  branch: string;
  originalBranch: string;
  difficulty: Difficulty;
}

interface SpotterState {
  enabled: boolean;
  difficulty: Difficulty;
  every: number; // trigger every N code-writing tool calls
  counter: number;
  exercise: ExerciseState | null;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const SpotterPlugin: Plugin = async ({ $, directory }) => {
  const state: SpotterState = {
    enabled: false,
    difficulty: "medium",
    every: 2,
    counter: 0,
    exercise: null,
  };

  // Tools that count as "code-writing" actions
  const CODE_WRITE_TOOLS = new Set(["write", "edit", "patch", "create"]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async function getCurrentBranch(): Promise<string> {
    const result = await $`git -C ${directory} branch --show-current`.text();
    return result.trim();
  }

  function difficultyLabel(d: Difficulty): string {
    switch (d) {
      case "lite":
        return "signature + structure provided — implement the body";
      case "medium":
        return "signature provided — implement the logic";
      case "hard":
        return "spec only — design and implement from scratch";
    }
  }

  function resetExercise() {
    state.exercise = null;
    state.counter = 0;
  }

  // Parse `/spotter on [lite|medium|hard] [--every N]`
  function parseSpotterArgs(args: string): { difficulty: Difficulty; every: number } {
    let difficulty: Difficulty = state.difficulty;
    let every = state.every;

    const parts = args.trim().split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "lite" || parts[i] === "medium" || parts[i] === "hard") {
        difficulty = parts[i] as Difficulty;
      }
      if (parts[i] === "--every" && parts[i + 1]) {
        const n = parseInt(parts[i + 1], 10);
        if (!isNaN(n) && n >= 1) every = n;
        i++;
      }
    }
    return { difficulty, every };
  }

  // ─── Commands ─────────────────────────────────────────────────────────────

  const commands = {
    "spotter:on": {
      description: "Enable Spotter gym mode",
      template: `
You are now in Spotter mode. When you next write code, scaffold the implementation
instead of completing it — leave a \`# SPOTTER: <brief description>\` marker for the
human to fill in. Call the \`spotter_exercise\` tool to set up the exercise.

Confirm with: "🏋️ Spotter is on. Difficulty: {{difficulty}}. I'll hand off every {{every}} code write(s)."
      `.trim(),
    },
    "spotter:off": {
      description: "Disable Spotter gym mode",
      template:
        "Confirm that Spotter gym mode is now off and you will resume writing code normally.",
    },
    "spotter:status": {
      description: "Show current Spotter status",
      template:
        "Report the current Spotter status: whether it is on or off, the difficulty level, and the exercise frequency.",
    },
    "spotter:done": {
      description: "Submit your implementation for Spotter review",
      template: `
The human has finished implementing the exercise. Here is their diff:

\`\`\`
!git diff HEAD
\`\`\`

Review the implementation:
1. What they got right (1–2 sentences)
2. What's missing or could be better (if anything)
3. Next steps if the exercise is incomplete

Be brief and direct. Do NOT show your own solution. Give targeted feedback only.
After the review, confirm that Spotter is resuming and continue the original task.
      `.trim(),
    },
    "spotter:hint": {
      description: "Get a targeted hint for the current Spotter exercise",
      template:
        "Give one targeted hint for the current exercise. Point toward the approach without revealing the implementation. Do not solve it.",
    },
    "spotter:solve": {
      description: "Concede — let the agent complete the current exercise",
      template:
        "The human has conceded this exercise. Complete the implementation, briefly note the key pattern they should remember, then resume the original task.",
    },
    "spotter:skip": {
      description: "Skip the current Spotter exercise with no penalty",
      template:
        "The human is skipping this exercise. Resume the original task and complete the code normally.",
    },
    "spotter:rep": {
      description: "Request an on-demand Spotter exercise for the next unit",
      template:
        "The human wants to do an exercise. Call the `spotter_exercise` tool for the next logical unit you were going to implement. Scaffold it and hand off to them.",
    },
  };

  // ─── Custom tool ─────────────────────────────────────────────────────────

  const spotter_exercise = tool({
    description:
      "Set up a Spotter coding exercise. Creates a git branch, writes a scaffold with SPOTTER markers, and hands off to the human. Call this instead of writing the implementation directly when Spotter is active.",
    args: {
      unit: tool.schema.string().describe("Name of the unit being exercised (e.g. 'UserAuth.login')"),
      filePath: tool.schema.string().describe("Relative path to the file to scaffold"),
      scaffold: tool.schema
        .string()
        .describe(
          "The scaffold code. Must include `# SPOTTER: <description>` (or language-appropriate comment) where the human should implement."
        ),
      difficulty: tool.schema
        .enum(["lite", "medium", "hard"])
        .describe("Difficulty level — must match the active session difficulty"),
    },
    async execute(args, ctx) {
      const { unit, filePath, scaffold, difficulty } = args;

      // Get current branch
      let originalBranch: string;
      try {
        originalBranch = await getCurrentBranch();
      } catch {
        originalBranch = "main";
      }

      // Create spotter branch
      const safeName = unit.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const branchName = `spotter/${safeName}`;

      try {
        await $`git -C ${directory} checkout -b ${branchName}`.quiet();
      } catch {
        // Branch may already exist; try to switch
        await $`git -C ${directory} checkout ${branchName}`.quiet();
      }

      // Write scaffold
      const fullPath = `${directory}/${filePath}`;
      await Bun.write(fullPath, scaffold);

      // Commit scaffold
      await $`git -C ${directory} add ${filePath}`.quiet();
      await $`git -C ${directory} commit -m "spotter: scaffold ${unit}"`.quiet();

      // Store exercise state
      state.exercise = {
        active: true,
        unit,
        filePath,
        branch: branchName,
        originalBranch,
        difficulty: difficulty as Difficulty,
      };
      state.counter = 0;

      const label = difficultyLabel(difficulty as Difficulty);
      return [
        `🏋️ Exercise ready: **${unit}**`,
        `Difficulty: ${difficulty} — ${label}`,
        `File: \`${filePath}\``,
        ``,
        `Edit the file in your editor, replace the \`# SPOTTER:\` marker with your implementation.`,
        `When done, run \`/spotter:done\`. Need help? \`/spotter:hint\`. Concede? \`/spotter:solve\`. Skip? \`/spotter:skip\``,
      ].join("\n");
    },
  });

  // ─── Hook: intercept code-writing tool calls ──────────────────────────────

  return {
    // Register custom commands dynamically
    config: async (cfg) => {
      cfg.command = cfg.command ?? {};
      for (const [name, def] of Object.entries(commands)) {
        cfg.command[name] = {
          template: def.template,
          description: def.description,
        };
      }
    },

    // Register custom tool
    tool: { spotter_exercise },

    // Count code writes and intercept when threshold reached
    "tool.execute.before": async (input, output) => {
      if (!state.enabled || state.exercise?.active) return;
      if (!CODE_WRITE_TOOLS.has(input.tool)) return;

      state.counter++;

      if (state.counter >= state.every) {
        state.counter = 0;
        // Signal the agent to hand off instead of writing
        throw new Error(
          `[Spotter] Counter reached. Call \`spotter_exercise\` to scaffold the next unit ` +
            `instead of writing it directly. Difficulty: ${state.difficulty}.`
        );
      }
    },

    // React to user commands to update plugin state
    event: async ({ event }) => {
      if (event.type !== "command.executed") return;

      // Safe cast — event.properties should contain the command name
      const cmd = (event as any).properties?.name ?? "";

      if (cmd === "spotter:on") {
        // Re-parse args from event if available
        const args = (event as any).properties?.args ?? "";
        const parsed = parseSpotterArgs(args);
        state.enabled = true;
        state.difficulty = parsed.difficulty;
        state.every = parsed.every;
        state.counter = 0;
        state.exercise = null;
      }

      if (cmd === "spotter:off") {
        state.enabled = false;
        state.exercise = null;
        state.counter = 0;
      }

      if (cmd === "spotter:done" || cmd === "spotter:solve" || cmd === "spotter:skip") {
        // Clean up: switch back to original branch after review
        if (state.exercise) {
          const orig = state.exercise.originalBranch;
          resetExercise();
          // Attempt to switch back; non-fatal if it fails
          try {
            await $`git -C ${directory} checkout ${orig}`.quiet();
          } catch {
            // ignore
          }
        }
      }
    },
  };
};
