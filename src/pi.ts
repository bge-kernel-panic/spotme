// Pi extension entry point
// Docs: https://github.com/earendil-works/pi/tree/main/packages/coding-agent#extensions

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { isToolCallEventType } from '@earendil-works/pi-coding-agent';
import { Type } from '@sinclair/typebox';
import { access } from 'fs/promises';
import { join } from 'path';
import {
  type Difficulty,
  type SpotMeState,
  blockedMessage,
  CODE_WRITE_TOOLS,
  donePrompt,
  exerciseReadyMessage,
  HINT_PROMPT,
  makeState,
  parseArgs,
  SKIP_PROMPT,
  solvePrompt,
  statusMessage,
} from './core.js';

export default function (pi: ExtensionAPI) {
  const state: SpotMeState = makeState();

  // True between a counter-triggered block and the subsequent spotme_exercise call.
  // Bypasses the write counter so the LLM can write the scaffold without retriggering.
  let exercisePending = false;

  // ─── Tool: spotme_exercise ─────────────────────────────────────────────────

  pi.registerTool({
    name: 'spotme_exercise',
    label: 'SpotMe Exercise',
    description:
      'Record the start of a SpotMe coding exercise. Call this AFTER writing the scaffold with the Write tool. Records the exercise in state and hands off to the human.',
    parameters: Type.Object({
      unit: Type.String({
        description: "Name of the unit being exercised (e.g. 'UserAuth.login')",
      }),
      filePath: Type.String({
        description: 'Relative path to the scaffold file (already written to disk)',
      }),
      difficulty: Type.Union([Type.Literal('lite'), Type.Literal('medium'), Type.Literal('hard')], {
        description: 'Difficulty — must match the active session setting',
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { unit, difficulty } = params;
      const cwd = ctx.cwd ?? process.cwd();

      // Normalise filePath: LLM may pass absolute or relative; always store relative.
      const rawPath = params.filePath;
      const fullPath = rawPath.startsWith('/') ? rawPath : join(cwd, rawPath);
      const filePath = fullPath.startsWith(cwd + '/') ? fullPath.slice(cwd.length + 1) : rawPath;

      // Verify file exists
      try {
        await access(fullPath);
      } catch {
        throw new Error(
          `Scaffold file not found at ${fullPath}. Write the scaffold with the Write tool first, then call spotme_exercise.`
        );
      }

      exercisePending = false;
      state.exercise = {
        active: true,
        unit,
        filePath,
        difficulty: difficulty as Difficulty,
      };
      state.counter = 0;

      const msg = exerciseReadyMessage(unit, filePath, difficulty as Difficulty);
      return { content: [{ type: 'text' as const, text: msg }], details: {} };
    },
  });

  // ─── Commands ─────────────────────────────────────────────────────────────

  pi.registerCommand('spotme:on', {
    description: 'Enable SpotMe gym mode [lite|medium|hard] [--every N]',
    handler: async (args, _ctx) => {
      const parsed = parseArgs(args ?? '', state);

      state.enabled = true;
      state.difficulty = parsed.difficulty;
      state.every = parsed.every;
      state.counter = 0;
      state.exercise = null;
      exercisePending = false;
      pi.sendUserMessage(
        `SpotMe is now on. Difficulty: ${state.difficulty}, triggering every ${state.every} code write(s). Confirm: "🏋️ SpotMe is on." Then continue normally.`
      );
    },
  });

  pi.registerCommand('spotme:off', {
    description: 'Disable SpotMe gym mode',
    handler: async (_args, _ctx) => {
      state.enabled = false;
      state.exercise = null;
      state.counter = 0;
      exercisePending = false;
      pi.sendUserMessage('SpotMe is now off. Resume writing code normally. Confirm briefly.');
    },
  });

  pi.registerCommand('spotme:status', {
    description: 'Show current SpotMe status',
    handler: async (_args, ctx) => {
      ctx.ui.notify(statusMessage(state), 'info');
    },
  });

  pi.registerCommand('spotme:done', {
    description: 'Submit your implementation for review',
    handler: async (_args, _ctx) => {
      const filePath = state.exercise?.filePath ?? '(unknown)';
      state.exercise = null;
      state.counter = 0;
      exercisePending = false;
      pi.sendUserMessage(donePrompt(filePath));
    },
  });

  pi.registerCommand('spotme:hint', {
    description: 'Get a targeted hint for the current exercise',
    handler: async () => {
      pi.sendUserMessage(HINT_PROMPT);
    },
  });

  pi.registerCommand('spotme:solve', {
    description: 'Concede — let the agent complete the exercise',
    handler: async (_args, _ctx) => {
      const filePath = state.exercise?.filePath ?? '(unknown)';
      state.exercise = null;
      state.counter = 0;
      exercisePending = false;
      pi.sendUserMessage(solvePrompt(filePath));
    },
  });

  pi.registerCommand('spotme:skip', {
    description: 'Skip this exercise with no penalty',
    handler: async (_args, _ctx) => {
      state.exercise = null;
      state.counter = 0;
      exercisePending = false;
      pi.sendUserMessage(SKIP_PROMPT);
    },
  });

  pi.registerCommand('spotme:rep', {
    description: 'Request an on-demand SpotMe exercise',
    handler: async () => {
      pi.sendUserMessage(
        'The human wants a coding exercise. Write the scaffold for the next logical unit using the Write tool (use a `# SPOTME: <description>` marker where the human should implement), then call `spotme_exercise` with the unit name, file path, and difficulty.'
      );
    },
  });

  // ─── Hook: intercept code-writing tool calls ──────────────────────────────

  pi.on('tool_call', async (event, _ctx) => {
    if (!state.enabled) return;
    // Bypass counter while waiting for the scaffold write and the spotme_exercise call,
    // and while an exercise is active (user is implementing).
    if (exercisePending || state.exercise?.active) return;
    if (!CODE_WRITE_TOOLS.has(event.toolName)) return;

    state.counter++;
    if (state.counter >= state.every) {
      state.counter = 0;
      exercisePending = true;
      const filePath =
        isToolCallEventType('write', event) || isToolCallEventType('edit', event)
          ? event.input.path
          : '';
      return {
        block: true,
        reason: blockedMessage(event.toolName, filePath, state.difficulty),
      };
    }
  });
}
