// OpenCode plugin entry point
// Docs: https://opencode.ai/docs/plugins

import { type Plugin, tool } from '@opencode-ai/plugin';
import { type TuiPlugin } from '@opencode-ai/plugin/tui';
import {
  type Difficulty,
  type SpotMeState,
  BLOCKED_REASON,
  CODE_WRITE_TOOLS,
  exerciseReadyMessage,
  HINT_PROMPT,
  makeState,
  parseArgs,
  SKIP_PROMPT,
  SOLVE_PROMPT,
  statusMessage,
} from './core.js';

export const SpotMePlugin: Plugin = async ({ $, directory }) => {
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
      // TypeScript narrows event to EventCommandExecuted here — no cast needed
      const cmd = event.properties.name;
      const rawArgs = event.properties.arguments;

      if (cmd === 'spotme:off') {
        // Also honour parseArgs in case someone passes args via the off command
        const parsed = parseArgs(rawArgs, state);
        state.enabled = false;
        state.difficulty = parsed.difficulty;
        state.every = parsed.every;
        state.exercise = null;
        state.counter = 0;
      }
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

// ─── TUI Plugin ──────────────────────────────────────────────────────────────
// Listens for spotme_exercise tool success → shows a DialogSelect with
// hint / done / solve / skip options so the user never has to type commands.
// Also shows toasts for spotme:on / spotme:off.

export const SpotMeTuiPlugin: TuiPlugin = async (api) => {
  // callID → sessionID for in-flight spotme_exercise calls
  const pendingCalls = new Map<string, string>();

  api.event.on('session.next.tool.called', (e) => {
    if (e.properties.tool === 'spotme_exercise') {
      pendingCalls.set(e.properties.callID, e.properties.sessionID);
    }
  });

  api.event.on('session.next.tool.success', (e) => {
    if (!pendingCalls.has(e.properties.callID)) return;
    pendingCalls.delete(e.properties.callID);

    const options = [
      {
        title: 'Hint',
        value: '/spotme:hint',
        description: 'Get a targeted hint without the answer',
      },
      {
        title: 'Done',
        value: '/spotme:done',
        description: 'Submit your implementation for review',
      },
      {
        title: 'Solve',
        value: '/spotme:solve',
        description: 'Let the agent complete it for you',
      },
      {
        title: 'Skip',
        value: '/spotme:skip',
        description: 'Skip and resume the original task',
      },
    ];

    api.ui.dialog.replace(() =>
      api.ui.DialogSelect<string>({
        title: '🏋️ SpotMe — Exercise Ready',
        options,
        skipFilter: true,
        onSelect: async (opt) => {
          api.ui.dialog.clear();
          await api.client.tui.appendPrompt({ text: opt.value });
          await api.client.tui.submitPrompt();
        },
      })
    );
  });

  // Toast feedback when gym mode turns on/off
  api.event.on('command.executed', (e) => {
    if (e.properties.name === 'spotme:on') {
      api.ui.toast({ variant: 'success', title: 'SpotMe', message: 'Gym mode is now ON' });
    } else if (e.properties.name === 'spotme:off') {
      api.ui.toast({ variant: 'info', title: 'SpotMe', message: 'Gym mode is now OFF' });
    }
  });
};
