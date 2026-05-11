// Pi extension entry point
// Docs: https://github.com/earendil-works/pi/tree/main/packages/coding-agent#extensions

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { isToolCallEventType } from '@earendil-works/pi-coding-agent';
import { Type } from '@sinclair/typebox';
import { exec } from 'child_process';
import { access } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
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
  SOLVE_PROMPT,
  statusMessage,
} from './core.js';

const execAsync = promisify(exec);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd });
  return stdout.trim();
}

export default function (pi: ExtensionAPI) {
  const state: SpotMeState = makeState();

  // ─── Tool: spotme_exercise ─────────────────────────────────────────────────

  pi.registerTool({
    name: 'spotme_exercise',
    label: 'SpotMe Exercise',
    description:
      'Set up a SpotMe coding exercise. Call this AFTER writing the scaffold with the Write tool. Branches off the current branch, commits the scaffold, and hands off to the human.',
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
    async execute(_toolCallId, params, _onUpdate, _ctx, _signal) {
      const { unit, filePath, difficulty } = params;
      const cwd = process.cwd();

      // Verify file exists before touching git
      try {
        await access(join(cwd, filePath));
      } catch {
        throw new Error(
          `Scaffold file not found at ${join(cwd, filePath)}. Write the scaffold with the Write tool first, then call spotme_exercise.`
        );
      }

      let originalBranch: string;
      try {
        originalBranch = await git(cwd, 'branch', '--show-current');
      } catch {
        originalBranch = 'main';
      }

      const safeName = unit.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const branchName = `spotme/${safeName}`;

      try {
        await git(cwd, 'checkout', '-b', branchName);
      } catch {
        await git(cwd, 'checkout', branchName);
      }

      await git(cwd, 'add', filePath);
      await git(cwd, 'commit', '-m', `spotme: scaffold ${unit}`);

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
      return { content: [{ type: 'text' as const, text: msg }], details: {} };
    },
  });

  // ─── Commands ─────────────────────────────────────────────────────────────

  pi.registerCommand('spotme:on', {
    description: 'Enable SpotMe gym mode [lite|medium|hard] [--every N]',
    handler: async (args, _ctx) => {
      const parsed = parseArgs(args ?? '', state);
      const cwd = process.cwd();

      // Ensure a git repo exists — init one if not
      let gitNote = '';
      try {
        await execAsync('git rev-parse --is-inside-work-tree', { cwd });
      } catch {
        await execAsync('git init', { cwd });
        await execAsync('git commit --allow-empty -m "chore: init repo for SpotMe"', { cwd });
        gitNote = ' (git repo initialised)';
      }

      state.enabled = true;
      state.difficulty = parsed.difficulty;
      state.every = parsed.every;
      state.counter = 0;
      state.exercise = null;
      pi.sendUserMessage(
        `SpotMe is now on${gitNote}. Difficulty: ${state.difficulty}, triggering every ${state.every} code write(s). Confirm: "🏋️ SpotMe is on." Then continue normally.`
      );
    },
  });

  pi.registerCommand('spotme:off', {
    description: 'Disable SpotMe gym mode',
    handler: async (_args, _ctx) => {
      state.enabled = false;
      state.exercise = null;
      state.counter = 0;
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
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd ?? process.cwd();
      let diff = '';
      try {
        diff = await git(cwd, 'diff', 'HEAD');
      } catch {
        diff = '(no diff available)';
      }

      if (state.exercise) {
        const orig = state.exercise.originalBranch;
        const tempBranch = state.exercise.branch;
        state.exercise = null;
        state.counter = 0;
        try {
          await git(cwd, 'checkout', orig);
          await git(cwd, 'branch', '-d', tempBranch);
        } catch {
          /* ignore */
        }
      }

      pi.sendUserMessage(donePrompt(diff));
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
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd ?? process.cwd();
      if (state.exercise) {
        const orig = state.exercise.originalBranch;
        const tempBranch = state.exercise.branch;
        state.exercise = null;
        state.counter = 0;
        try {
          await git(cwd, 'checkout', orig);
          await git(cwd, 'branch', '-d', tempBranch);
        } catch {
          /* ignore */
        }
      }
      pi.sendUserMessage(SOLVE_PROMPT);
    },
  });

  pi.registerCommand('spotme:skip', {
    description: 'Skip this exercise with no penalty',
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd ?? process.cwd();
      if (state.exercise) {
        const orig = state.exercise.originalBranch;
        const tempBranch = state.exercise.branch;
        state.exercise = null;
        state.counter = 0;
        try {
          await git(cwd, 'checkout', orig);
          await git(cwd, 'branch', '-d', tempBranch);
        } catch {
          /* ignore */
        }
      }
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
    if (!state.enabled || state.exercise?.active) return;
    if (!CODE_WRITE_TOOLS.has(event.toolName)) return;

    state.counter++;
    if (state.counter >= state.every) {
      state.counter = 0;
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
