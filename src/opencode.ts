// OpenCode plugin entry point
// Docs: https://opencode.ai/docs/plugins

import { type Plugin, tool } from '@opencode-ai/plugin';
import {
  type Difficulty,
  type SpotterState,
  BLOCKED_REASON,
  CODE_WRITE_TOOLS,
  donePrompt,
  exerciseReadyMessage,
  HINT_PROMPT,
  makeState,
  parseArgs,
  SKIP_PROMPT,
  SOLVE_PROMPT,
  statusMessage,
} from './core.js';

export const SpotterPlugin: Plugin = async ({ $, directory }) => {
  const state: SpotterState = makeState();

  async function getCurrentBranch(): Promise<string> {
    return (await $`git -C ${directory} branch --show-current`.text()).trim();
  }

  // ─── Custom tool ───────────────────────────────────────────────────────────

  const spotter_exercise = tool({
    description:
      'Set up a Spotter coding exercise. Creates a git branch, writes a scaffold with SPOTTER markers, and hands off to the human. Call this instead of writing the implementation directly when Spotter is active.',
    args: {
      unit: tool.schema
        .string()
        .describe("Name of the unit being exercised (e.g. 'UserAuth.login')"),
      filePath: tool.schema.string().describe('Relative path to the file to scaffold'),
      scaffold: tool.schema
        .string()
        .describe(
          'The scaffold code. Must include a `# SPOTTER: <description>` marker (or language-appropriate comment) where the human should implement.'
        ),
      difficulty: tool.schema
        .enum(['lite', 'medium', 'hard'])
        .describe('Difficulty — must match the active session setting'),
    },
    async execute(args) {
      const { unit, filePath, scaffold, difficulty } = args;

      let originalBranch: string;
      try {
        originalBranch = await getCurrentBranch();
      } catch {
        originalBranch = 'main';
      }

      const safeName = unit.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const branchName = `spotter/${safeName}`;

      try {
        await $`git -C ${directory} checkout -b ${branchName}`.quiet();
      } catch {
        await $`git -C ${directory} checkout ${branchName}`.quiet();
      }

      const fullPath = `${directory}/${filePath}`;
      await Bun.write(fullPath, scaffold);
      await $`git -C ${directory} add ${filePath}`.quiet();
      await $`git -C ${directory} commit -m "spotter: scaffold ${unit}"`.quiet();

      state.exercise = {
        active: true,
        unit,
        filePath,
        branch: branchName,
        originalBranch,
        difficulty: difficulty as Difficulty,
      };
      state.counter = 0;

      return exerciseReadyMessage(unit, filePath, difficulty as Difficulty);
    },
  });

  // ─── Commands ─────────────────────────────────────────────────────────────

  const commands = {
    'spotter:on': {
      description: 'Enable Spotter gym mode',
      template: `You are now in Spotter mode. Difficulty: ${state.difficulty}. Every ${state.every} code write(s), call \`spotter_exercise\` to scaffold the next unit instead of writing it directly. Confirm: "🏋️ Spotter is on."`,
    },
    'spotter:off': {
      description: 'Disable Spotter gym mode',
      template:
        'Confirm that Spotter gym mode is now off and you will resume writing code normally.',
    },
    'spotter:status': {
      description: 'Show current Spotter status',
      template: statusMessage(state),
    },
    'spotter:done': {
      description: 'Submit your implementation for Spotter review',
      template: `The human has finished the exercise. Run: !git diff HEAD\n\nThen ${donePrompt('<diff from above>')}`,
    },
    'spotter:hint': { description: 'Get a hint', template: HINT_PROMPT },
    'spotter:solve': { description: 'Concede — let the agent finish', template: SOLVE_PROMPT },
    'spotter:skip': { description: 'Skip this exercise', template: SKIP_PROMPT },
    'spotter:rep': {
      description: 'Request an on-demand exercise',
      template:
        'The human wants to do an exercise. Call `spotter_exercise` for the next logical unit you were going to implement.',
    },
  };

  // ─── Hooks ─────────────────────────────────────────────────────────────────

  return {
    config: async (cfg) => {
      cfg.command = cfg.command ?? {};
      for (const [name, def] of Object.entries(commands)) {
        cfg.command[name] = { template: def.template, description: def.description };
      }
    },

    tool: { spotter_exercise },

    'tool.execute.before': async (input) => {
      if (!state.enabled || state.exercise?.active) return;
      if (!CODE_WRITE_TOOLS.has(input.tool)) return;
      state.counter++;
      if (state.counter >= state.every) {
        state.counter = 0;
        throw new Error(BLOCKED_REASON + ` Difficulty: ${state.difficulty}.`);
      }
    },

    event: async ({ event }) => {
      if (event.type !== 'command.executed') return;
      const cmd = (event as any).properties?.name ?? '';
      const rawArgs = (event as any).properties?.args ?? '';

      if (cmd === 'spotter:on') {
        const parsed = parseArgs(rawArgs, state);
        state.enabled = true;
        state.difficulty = parsed.difficulty;
        state.every = parsed.every;
        state.counter = 0;
        state.exercise = null;
      }
      if (cmd === 'spotter:off') {
        state.enabled = false;
        state.exercise = null;
        state.counter = 0;
      }
      if (cmd === 'spotter:done' || cmd === 'spotter:solve' || cmd === 'spotter:skip') {
        if (state.exercise) {
          const orig = state.exercise.originalBranch;
          state.exercise = null;
          state.counter = 0;
          try {
            await $`git -C ${directory} checkout ${orig}`.quiet();
          } catch {
            /* ignore */
          }
        }
      }
    },
  };
};
