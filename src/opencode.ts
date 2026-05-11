// OpenCode plugin entry point
// Docs: https://opencode.ai/docs/plugins

import { type Plugin, tool } from '@opencode-ai/plugin';
import {
  type Difficulty,
  type SpotMeState,
  blockedMessage,
  CODE_WRITE_TOOLS,
  exerciseReadyMessage,
  HINT_PROMPT,
  makeState,
  parseArgs,
  SKIP_PROMPT,
  SOLVE_PROMPT,
  statusMessage,
} from './core.js';

export const SpotMePlugin: Plugin = async ({ $, directory, client }) => {
  const state: SpotMeState = makeState();

  async function getCurrentBranch(): Promise<string> {
    return (await $`git -C ${directory} branch --show-current`.text()).trim();
  }

  // ─── Tools ────────────────────────────────────────────────────────────────

  const spotme_on = tool({
    description: 'Activate SpotMe gym mode with the specified difficulty and frequency.',
    args: {
      difficulty: tool.schema.enum(['lite', 'medium', 'hard']).describe('Exercise difficulty'),
      every: tool.schema
        .number()
        .describe('How many code writes before triggering an exercise (default: 2)'),
    },
    async execute(args) {
      // Ensure a git repo exists — init one if not
      let gitNote = '';
      try {
        await $`git -C ${directory} rev-parse --is-inside-work-tree`.quiet();
      } catch {
        await $`git -C ${directory} init`.quiet();
        await $`git -C ${directory} commit --allow-empty -m "chore: init repo for SpotMe"`.quiet();
        gitNote = ' (git repo initialised)';
      }

      state.enabled = true;
      state.difficulty = args.difficulty as Difficulty;
      state.every = Math.max(1, Math.floor(args.every));
      state.counter = 0;
      state.exercise = null;
      return `🏋️ SpotMe is on${gitNote}. Difficulty: ${state.difficulty}. Triggering every ${state.every} code write(s). Use \`spotme_exercise\` when the counter is reached.`;
    },
  });

  const spotme_exercise = tool({
    description:
      'Set up a SpotMe coding exercise. Call this AFTER writing the scaffold with the Write tool. Branches off the current branch, commits the scaffold, and hands off to the human.',
    args: {
      unit: tool.schema
        .string()
        .describe("Name of the unit being exercised (e.g. 'UserAuth.login')"),
      filePath: tool.schema
        .string()
        .describe('Relative path to the scaffold file (already written to disk)'),
      difficulty: tool.schema
        .enum(['lite', 'medium', 'hard'])
        .describe('Difficulty — must match the active session setting'),
    },
    async execute(args) {
      const { unit, filePath, difficulty } = args;

      // Verify file exists before touching git
      const fullPath = `${directory}/${filePath}`;
      const file = Bun.file(fullPath);
      if (!(await file.exists())) {
        throw new Error(
          `Scaffold file not found at ${fullPath}. Write the scaffold with the Write tool first, then call spotme_exercise.`
        );
      }

      let originalBranch: string;
      try {
        originalBranch = await getCurrentBranch();
      } catch {
        originalBranch = 'main';
      }

      const safeName = unit.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const branchName = `spotme/${safeName}`;

      try {
        await $`git -C ${directory} checkout -b ${branchName}`.quiet();
      } catch {
        await $`git -C ${directory} checkout ${branchName}`.quiet();
      }

      await $`git -C ${directory} add ${filePath}`.quiet();
      await $`git -C ${directory} commit -m "spotme: scaffold ${unit}"`.quiet();

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

  const spotme_status = tool({
    description:
      'Show the current SpotMe session status (enabled, difficulty, counter, active exercise).',
    args: {},
    async execute() {
      return statusMessage(state);
    },
  });

  // ─── Commands ─────────────────────────────────────────────────────────────

  const commands = {
    'spotme:on': {
      description: 'Enable SpotMe gym mode [lite|medium|hard] [--every N]',
      template:
        'The user wants to enable SpotMe. Parse any difficulty (lite/medium/hard) and frequency (--every N) from their message — if not specified use current defaults (medium, every 2). Then call `spotme_on` with those values.',
    },
    'spotme:off': {
      description: 'Disable SpotMe gym mode',
      template:
        'Confirm that SpotMe gym mode is now off and you will resume writing code normally.',
    },
    'spotme:status': {
      description: 'Show current SpotMe status',
      template: 'Call the `spotme_status` tool and display the result to the user.',
    },
    'spotme:done': {
      description: 'Submit your implementation for SpotMe review',
      template:
        'Run `git diff HEAD` to get the diff of the current exercise branch, then review the implementation: (1) what they got right — 1–2 sentences, specific; (2) what could be better — concrete, no vague feedback; (3) next steps only if incomplete. Do NOT show your own solution. After the review, resume the original task.',
    },
    'spotme:hint': { description: 'Get a hint for the current exercise', template: HINT_PROMPT },
    'spotme:solve': {
      description: 'Concede — let the agent finish the exercise',
      template: SOLVE_PROMPT,
    },
    'spotme:skip': { description: 'Skip this exercise', template: SKIP_PROMPT },
    'spotme:rep': {
      description: 'Request an on-demand SpotMe exercise',
      template:
        'The human wants a coding exercise. Write the scaffold for the next logical unit using the Write tool (use a `# SPOTME: <description>` marker where the human should implement), then call `spotme_exercise` with the unit name, file path, and difficulty.',
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

    tool: { spotme_on, spotme_exercise, spotme_status },

    'tool.execute.before': async (input, output) => {
      if (!state.enabled || state.exercise?.active) return;
      if (!CODE_WRITE_TOOLS.has(input.tool)) return;
      state.counter++;
      if (state.counter >= state.every) {
        state.counter = 0;
        const filePath: string = (output.args?.filePath ?? output.args?.path ?? '') as string;
        throw new Error(blockedMessage(input.tool, filePath, state.difficulty));
      }
    },

    'command.execute.before': async (input) => {
      const { command, arguments: rawArgs } = input;

      if (command === 'spotme:on') {
        // Pre-mutate state immediately so the blocker is aware before LLM calls spotme_on
        const parsed = parseArgs(rawArgs, state);
        state.enabled = true;
        state.difficulty = parsed.difficulty;
        state.every = parsed.every;
        state.counter = 0;
        state.exercise = null;
        // Show toast instantly — the LLM will also confirm via the spotme_on tool
        await client.tui.showToast({
          body: {
            title: 'SpotMe',
            message: `🏋️ On — ${state.difficulty}, every ${state.every} write(s)`,
            variant: 'success',
          },
        });
        return;
      }

      if (command === 'spotme:off') {
        state.enabled = false;
        state.exercise = null;
        state.counter = 0;
        await client.tui.showToast({
          body: { title: 'SpotMe', message: '⏹️ Off — normal coding resumed', variant: 'info' },
        });
        return;
      }
      // spotme:status — no hook action; LLM calls spotme_status tool and shows live state
    },

    event: async ({ event }) => {
      if (event.type !== 'command.executed') return;
      // TypeScript narrows event to EventCommandExecuted here — no cast needed
      const cmd = event.properties.name;

      if (cmd === 'spotme:done' || cmd === 'spotme:solve' || cmd === 'spotme:skip') {
        if (state.exercise) {
          const orig = state.exercise.originalBranch;
          const tempBranch = state.exercise.branch;
          state.exercise = null;
          state.counter = 0;
          try {
            await $`git -C ${directory} checkout ${orig}`.quiet();
            await $`git -C ${directory} branch -d ${tempBranch}`.quiet();
          } catch {
            /* ignore */
          }
        }
      }
    },
  };
};
