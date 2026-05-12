// ─── OpenCode adapter ───────────────────────────────────────────────────────
// Thin wiring layer: connects SpotMeEngine to OpenCode's plugin API.

import { type Plugin, tool } from '@opencode-ai/plugin';
import { SpotMeEngine } from './engine.js';
import { PROMPTS } from './prompts.js';
import type { Difficulty } from './types.js';

export const SpotMePlugin: Plugin = async ({ directory, client }) => {
  const engine = new SpotMeEngine({
    resolvePath(rawPath) {
      const fullPath = rawPath.startsWith('/') ? rawPath : `${directory}/${rawPath}`;
      const relativePath = fullPath.startsWith(`${directory}/`)
        ? fullPath.slice(directory.length + 1)
        : rawPath;
      return { fullPath, relativePath };
    },
    async fileExists(fullPath) {
      return Bun.file(fullPath).exists();
    },
  });

  // ─── Tools ──────────────────────────────────────────────────────────────

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
      const result = engine.activate({
        difficulty: args.difficulty as Difficulty,
        every: args.every,
      });
      return result.message;
    },
  });

  const spotme_exercise = tool({
    description:
      'Record the start of a SpotMe coding exercise. Call this AFTER writing the scaffold with the Write tool.',
    args: {
      unit: tool.schema
        .string()
        .describe("Name of the unit being exercised (e.g. 'UserAuth.login')"),
      filePath: tool.schema
        .string()
        .describe('Path to the scaffold file (already written to disk)'),
      difficulty: tool.schema
        .enum(['lite', 'medium', 'hard'])
        .describe('Difficulty — must match the active session setting'),
    },
    async execute(args) {
      const result = await engine.recordExercise(
        args.unit,
        args.filePath,
        args.difficulty as Difficulty
      );
      return result.message;
    },
  });

  const spotme_status = tool({
    description: 'Show the current SpotMe session status.',
    args: {},
    async execute() {
      return engine.getStatus();
    },
  });

  const spotme_end = tool({
    description:
      'Close the current SpotMe exercise. Call this after reviewing, solving, or skipping.',
    args: {},
    async execute() {
      return engine.endExercise();
    },
  });

  // ─── Commands ─────────────────────────────────────────────────────────────

  const commands: Record<string, { description: string; template: string }> = {
    'spotme:on': {
      description: 'Enable SpotMe gym mode [lite|medium|hard] [--every N]',
      template: PROMPTS.ON,
    },
    'spotme:off': { description: 'Disable SpotMe gym mode', template: PROMPTS.OFF },
    'spotme:status': { description: 'Show current SpotMe status', template: PROMPTS.STATUS },
    'spotme:done': {
      description: 'Submit your implementation for SpotMe review',
      template: PROMPTS.DONE,
    },
    'spotme:hint': {
      description: 'Get a hint for the current exercise',
      template: PROMPTS.HINT,
    },
    'spotme:solve': {
      description: 'Concede — let the agent finish the exercise',
      template: PROMPTS.SOLVE,
    },
    'spotme:skip': { description: 'Skip this exercise', template: PROMPTS.SKIP },
    'spotme:rep': {
      description: 'Request an on-demand SpotMe exercise',
      template: PROMPTS.REP,
    },
  };

  // ─── Hooks ────────────────────────────────────────────────────────────────

  return {
    config: async (cfg) => {
      cfg.command = cfg.command ?? {};
      for (const [name, def] of Object.entries(commands)) {
        cfg.command[name] = { template: def.template, description: def.description };
      }
    },

    tool: { spotme_on, spotme_exercise, spotme_status, spotme_end },

    'tool.execute.before': async (input, output) => {
      const filePath = (output.args?.filePath ?? output.args?.path ?? '') as string;
      const result = engine.interceptWriteToolCall(input.tool, filePath);
      if (result.blocked) throw new Error(result.message);
    },

    'command.execute.before': async (input) => {
      const { command, arguments: rawArgs } = input;

      if (command === 'spotme:on') {
        engine.activateFromArgs(rawArgs);
        await client.tui.showToast({
          body: {
            title: 'SpotMe',
            message: `🏋️ On — ${engine.state.difficulty}, every ${engine.state.every} write(s)`,
            variant: 'success',
          },
        });
        return;
      }

      if (command === 'spotme:off') {
        engine.deactivate();
        await client.tui.showToast({
          body: { title: 'SpotMe', message: '⏹️ Off — normal coding resumed', variant: 'info' },
        });
      }
    },
  };
};
