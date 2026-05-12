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
  SOLVE_PROMPT,
  statusMessage,
} from './core.js';

export const SpotMePlugin: Plugin = async ({ directory, client }) => {
  const state: SpotMeState = makeState();

  // True between a counter-triggered block and the subsequent spotme_exercise call.
  // Bypasses the write counter so the LLM can write the scaffold without retriggering.
  let exercisePending = false;

  // How many more write tool calls to bypass after spotme_end before counting resumes.
  // Gives the LLM a write-count grace window so resume writes don't immediately re-trigger.
  // Set to state.every on close; decremented (not counted) on each bypassed write.
  let graceWritesRemaining = 0;

  // ─── Tools ────────────────────────────────────────────────────────────────

  const spotme_on = tool({
    description: 'Activate SpotMe gym mode with the specified difficulty and frequency.',
    args: {
      difficulty: tool.schema
        .enum(['lite', 'medium', 'hard'])
        .default('medium')
        .describe('Exercise difficulty (default: medium)'),
      every: tool.schema
        .number()
        .default(2)
        .describe('How many code writes before triggering an exercise (default: 2)'),
    },
    async execute(args) {
      state.enabled = true;
      state.difficulty = args.difficulty as Difficulty;
      state.every = Math.max(1, Math.floor(args.every));
      state.counter = 0;
      state.exercise = null;
      exercisePending = false;
      graceWritesRemaining = 0;
      return `🏋️ SpotMe is on. Difficulty: ${state.difficulty}. Triggering every ${state.every} code write(s). Use \`spotme_exercise\` when the counter is reached.`;
    },
  });

  const spotme_exercise = tool({
    description:
      'Record the start of a SpotMe coding exercise. Call this AFTER writing the scaffold with the Write tool. Records the exercise in state and hands off to the human.',
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
      const { unit, difficulty } = args;

      // Normalise filePath: LLM may pass absolute or relative; always store relative.
      const rawPath = args.filePath;
      const fullPath = rawPath.startsWith('/') ? rawPath : `${directory}/${rawPath}`;
      const filePath = fullPath.startsWith(`${directory}/`)
        ? fullPath.slice(directory.length + 1)
        : rawPath;

      // Verify file exists
      const file = Bun.file(fullPath);
      if (!(await file.exists())) {
        throw new Error(
          `Scaffold file not found at ${fullPath}. Write the scaffold with the Write tool first, then call spotme_exercise.`
        );
      }

      exercisePending = false;
      graceWritesRemaining = 0;
      state.exercise = {
        active: true,
        unit,
        filePath,
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

  const spotme_end = tool({
    description:
      'Close the current SpotMe exercise. Call this after reviewing, solving, or skipping — once the exercise turn is fully complete.',
    args: {},
    async execute() {
      state.exercise = null;
      state.counter = 0;
      exercisePending = false;
      // Give a grace window of `every` writes so LLM resume writes don't immediately re-trigger.
      graceWritesRemaining = state.every;
      return '✅ Exercise closed. Counter reset. Resuming normal mode.';
    },
  });

  // ─── Commands ─────────────────────────────────────────────────────────────

  const commands = {
    'spotme:on': {
      description: 'Enable SpotMe gym mode [lite|medium|hard] [--every N]',
      template:
        'SpotMe gym mode was just activated. Call `spotme_status` to get the current settings, then confirm them to the user in one sentence.',
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
        "Call `spotme_status` to get the active exercise details. Read the exercise file. Evaluate the user's implementation: (1) what they got right — 1–2 sentences, specific; (2) what could be better — concrete, no vague feedback; (3) next steps only if incomplete. Do NOT show your own solution. Then call `spotme_end` to close the exercise and resume the original task.",
    },
    'spotme:hint': { description: 'Get a hint for the current exercise', template: HINT_PROMPT },
    'spotme:solve': {
      description: 'Concede — let the agent finish the exercise',
      template: SOLVE_PROMPT,
    },
    'spotme:skip': {
      description: 'Skip this exercise',
      template:
        'The human is skipping this exercise. Call `spotme_end` to close it, then resume the original task and complete the code normally.',
    },
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

    tool: { spotme_on, spotme_exercise, spotme_status, spotme_end },

    'tool.execute.before': async (input, output) => {
      if (!state.enabled) return;
      // Bypass counter while:
      // - waiting for scaffold write + spotme_exercise call (exercisePending)
      // - exercise is active — user is implementing (state.exercise?.active)
      if (exercisePending || state.exercise?.active) return;
      // Consume one grace write (LLM resuming after solve/skip) without counting it.
      if (graceWritesRemaining > 0) {
        if (CODE_WRITE_TOOLS.has(input.tool)) graceWritesRemaining--;
        return;
      }
      if (!CODE_WRITE_TOOLS.has(input.tool)) return;
      state.counter++;
      if (state.counter >= state.every) {
        state.counter = 0;
        exercisePending = true;
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
        exercisePending = false;
        graceWritesRemaining = 0;
        // Show toast instantly — the LLM will also confirm via spotme_status
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
        exercisePending = false;
        graceWritesRemaining = 0;
        await client.tui.showToast({
          body: { title: 'SpotMe', message: '⏹️ Off — normal coding resumed', variant: 'info' },
        });
        return;
      }
      // spotme:status, done, solve, skip, hint, rep — no hook action needed.
      // State for done/solve/skip is cleared by the LLM calling spotme_end.
    },
  };
};
