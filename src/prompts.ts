// ─── All prompt templates and display messages ─────────────────────────────
// Single source of truth for every string the LLM or user sees.

import type { Difficulty, SpotMeState } from './types.js';

// ─── Difficulty labels ────────────────────────────────────────────────────────

function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case 'lite':
      return 'signature + structure provided — implement the body';
    case 'medium':
      return 'signature provided — implement the logic';
    case 'hard':
      return 'spec only — design and implement from scratch';
  }
}

// ─── Comment syntax helpers ────────────────────────────────────────────────────

const EXT_COMMENT: Record<string, { open: string; close?: string }> = {
  // C-style
  ts: { open: '//' },
  tsx: { open: '//' },
  js: { open: '//' },
  jsx: { open: '//' },
  java: { open: '//' },
  c: { open: '//' },
  cpp: { open: '//' },
  cs: { open: '//' },
  go: { open: '//' },
  swift: { open: '//' },
  kt: { open: '//' },
  rs: { open: '//' },
  php: { open: '//' },
  dart: { open: '//' },
  // Hash-style
  py: { open: '#' },
  rb: { open: '#' },
  sh: { open: '#' },
  bash: { open: '#' },
  zsh: { open: '#' },
  yaml: { open: '#' },
  yml: { open: '#' },
  toml: { open: '#' },
  r: { open: '#' },
  // Block-style
  html: { open: '<!--', close: '-->' },
  xml: { open: '<!--', close: '-->' },
  svg: { open: '<!--', close: '-->' },
  css: { open: '/*', close: '*/' },
  scss: { open: '//' },
  sass: { open: '//' },
  less: { open: '//' },
  // Double-dash
  lua: { open: '--' },
  sql: { open: '--' },
  // Lisp-style
  el: { open: ';;' },
  clj: { open: ';;' },
};

function commentForFile(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const syntax = EXT_COMMENT[ext] ?? { open: '//' };
  return syntax.close
    ? `${syntax.open} SPOTME: <description> ${syntax.close}`
    : `${syntax.open} SPOTME: <description>`;
}

/** The literal token that marks an exercise line. The engine scans for it to
 *  protect the human's file, and `concede()` strips lines containing it. */
export const MARKER_TOKEN = 'SPOTME';

/**
 * True if `line` is a SPOTME marker line for the given file type. For a known
 * extension we require the language's comment opener, so the token inside a
 * string or identifier doesn't count. Unknown extensions degrade to a bare
 * token match.
 */
export function lineIsMarker(line: string, filePath: string): boolean {
  if (!line.includes(MARKER_TOKEN)) return false;
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const syntax = EXT_COMMENT[ext];
  if (!syntax) return true;
  return line.trimStart().startsWith(syntax.open);
}

// ─── Display messages (returned to user / LLM as tool output) ──────────────

export function statusMessage(state: SpotMeState): string {
  const lines = [
    `SpotMe: ${state.enabled ? '🟢 on' : '⚪ off'}`,
    `Difficulty: ${state.difficulty}`,
    `Trigger every: ${state.every} code write(s)`,
    `Counter: ${state.counter}/${state.every}`,
  ];
  if (state.exercise?.active) {
    lines.push(`Active exercise: ${state.exercise.unit} (${state.exercise.filePath})`);
  }
  return lines.join('\n');
}

export function exerciseReadyMessage(
  unit: string,
  filePath: string,
  difficulty: Difficulty
): string {
  return [
    `🏋️ Exercise ready: **${unit}**`,
    `Difficulty: ${difficulty} — ${difficultyLabel(difficulty)}`,
    `File: \`${filePath}\``,
    ``,
    `⛔ AGENT: STOP HERE. This exercise belongs to the human, not you.`,
    `Do NOT write, edit, or complete this code. Do not "help" by filling it in.`,
    `Wait for the human to run \`/spotme:done\`, \`/spotme:solve\`, or \`/spotme:skip\`.`,
    ``,
    `Human: edit the file in your editor. Replace the \`SPOTME:\` marker with your implementation.`,
    ``,
    `Your options:`,
    `  \`/spotme:hint\`  — get a targeted hint`,
    `  \`/spotme:solve\` — concede and let the agent finish`,
    `  \`/spotme:skip\`  — skip this exercise`,
    `  \`/spotme:done\`  — submit your implementation for review`,
  ].join('\n');
}

export function blockedMessage(toolName: string, filePath: string, difficulty: Difficulty): string {
  const marker = commentForFile(filePath);
  const scaffoldStep =
    toolName === 'edit' && filePath
      ? `Edit \`${filePath}\` to add a \`${marker}\` comment at the location where the implementation should go.`
      : filePath
        ? `Write the scaffold to \`${filePath}\` using the Write tool. Include a \`${marker}\` comment where the implementation should go.`
        : `Write the scaffold file using the Write tool. Include a \`${marker}\` comment (use appropriate comment syntax for the language) where the implementation should go.`;

  return [
    `[SpotMe] Counter reached — time for an exercise!`,
    ``,
    `Write ONLY the scaffold with the marker. Do NOT implement the body — that is the human's job.`,
    ``,
    `Follow these steps in order, then STOP:`,
    `1. ${scaffoldStep}`,
    `2. Call \`spotme_exercise\` with the unit name, the file path, and difficulty "${difficulty}".`,
    `3. Display the full return value of \`spotme_exercise\` verbatim to the user (do not summarize).`,
    `4. STOP. Do not write, edit, or complete the exercise. Hand control back to the human.`,
  ].join('\n');
}

/** Shown when the agent tries to write a file that still holds a SPOTME marker
 *  while an exercise is active. This is a hard block, not a suggestion. */
export function protectedFileMessage(filePath: string): string {
  return [
    `⛔ [SpotMe] \`${filePath}\` is an active exercise for the human — you cannot edit it.`,
    `It still contains a SPOTME marker. Leave this file alone.`,
    `To take over, the human runs \`/spotme:solve\`; to move on, \`/spotme:skip\`.`,
    `Do not attempt to write this file again until then.`,
  ].join('\n');
}

// ─── LLM instruction templates (injected as command templates / user messages) ─

export const PROMPTS = {
  /** /spotme:on — confirm settings after hook already set state. */
  ON: 'SpotMe gym mode was just activated. Call `spotme_status` to get the current settings, then confirm them to the user in one sentence.',

  /** /spotme:off — brief confirmation. */
  OFF: 'Confirm that SpotMe gym mode is now off and you will resume writing code normally.',

  /** /spotme:status — display current state. */
  STATUS: 'Call the `spotme_status` tool and display the result to the user.',

  /** /spotme:hint — one hint, no spoilers. */
  HINT: 'Give one targeted hint for the current SpotMe exercise. Point toward the approach without revealing the implementation. One paragraph max.',

  /** /spotme:rep — on-demand exercise. */
  REP: 'The human wants a coding exercise. Write the scaffold for the next logical unit using the Write tool (use a `# SPOTME: <description>` marker where the human should implement), then call `spotme_exercise` with the unit name, file path, and difficulty.',

  /** OpenCode compatibility: static uppercase aliases for the no-arg versions. */
  get DONE(): string {
    return this.done();
  },
  get SOLVE(): string {
    return this.solve();
  },
  get SKIP(): string {
    return this.skip();
  },

  /**
   * /spotme:done — review user's implementation, then close.
   * If exercise data is provided (Pi), inject it directly.
   * Otherwise (OpenCode), tell the LLM to call spotme_status first.
   */
  done(exercise?: { unit: string; filePath: string }): string {
    if (exercise) {
      return `Current SpotMe exercise: **${exercise.unit}** in \`${exercise.filePath}\`.\n\nRead the exercise file. Evaluate the user's implementation: (1) what they got right — 1-2 sentences, specific; (2) what could be better — concrete, no vague feedback; (3) next steps only if incomplete. Do NOT show your own solution. Resume the original task and complete any remaining code. Call \`spotme_end\` as the LAST thing you do.`;
    }
    return "Call `spotme_status` to get the active exercise details. Read the exercise file. Evaluate the user's implementation: (1) what they got right — 1-2 sentences, specific; (2) what could be better — concrete, no vague feedback; (3) next steps only if incomplete. Do NOT show your own solution. Resume the original task and complete any remaining code. Call `spotme_end` as the LAST thing you do.";
  },

  /**
   * /spotme:solve — concede and let the agent finish.
   * If exercise data is provided (Pi), inject it directly.
   * Otherwise (OpenCode), tell the LLM to call spotme_status first.
   */
  solve(exercise?: { unit: string; filePath: string }): string {
    if (exercise) {
      return `Current SpotMe exercise: **${exercise.unit}** in \`${exercise.filePath}\`.\n\nRead the exercise file. Write the solution (replace the SPOTME marker if still present, or improve what the user wrote). Briefly note the key pattern the user should remember. Resume the original task and complete any remaining code. Call \`spotme_end\` as the LAST thing you do.`;
    }
    return 'Call `spotme_status` to get the active exercise details. Read the exercise file. Write the solution (replace the SPOTME marker if still present, or improve what the user wrote). Briefly note the key pattern the user should remember. Resume the original task and complete any remaining code. Call `spotme_end` as the LAST thing you do.';
  },

  /**
   * /spotme:skip — skip this exercise.
   * If exercise data is provided (Pi), inject it directly.
   * Otherwise (OpenCode), generic skip prompt.
   */
  skip(exercise?: { unit: string; filePath: string }): string {
    if (exercise) {
      return `The human is skipping the SpotMe exercise **${exercise.unit}** in \`${exercise.filePath}\`. Resume the original task and complete the code normally. Call \`spotme_end\` as the LAST thing you do.`;
    }
    return 'The human is skipping this exercise. Resume the original task and complete the code normally. Call `spotme_end` as the LAST thing you do.';
  },
} as const;

// ─── Prompt builder ─────────────────────────────────────────────────────────

export type PromptKey = keyof typeof PROMPTS;

export interface PromptOverrides {
  all?: string;
  on?: string;
  off?: string;
  status?: string;
  done?: string;
  hint?: string;
  solve?: string;
  skip?: string;
  rep?: string;
}

export function buildPrompts(overrides?: PromptOverrides): Record<PromptKey, string> {
  const keys = Object.keys(PROMPTS) as PromptKey[];
  const result = {} as Record<PromptKey, string>;

  for (const key of keys) {
    const lowerKey = key.toLowerCase() as keyof PromptOverrides;
    const base = (overrides?.[lowerKey] as string | undefined) ?? PROMPTS[key];
    result[key] = overrides?.all ? `${base}\n${overrides.all}` : base;
  }

  return result;
}

// ─── Claude-specific prompts ─────────────────────────────────────────────────

export const CLAUDE_PROMPTS: Record<PromptKey, string> = buildPrompts({
  on: 'Call `mcp__plugin_spotme_spotme__spotme_on` with "$ARGUMENTS" (may be empty — defaults will be used). Then call `mcp__plugin_spotme_spotme__spotme_status` and confirm the settings in one sentence.',
  off: 'Call `mcp__plugin_spotme_spotme__spotme_off`. Confirm SpotMe is off and you will resume coding normally.',
  status: 'Call `mcp__plugin_spotme_spotme__spotme_status` and display the result to the user.',
  rep: 'Call `mcp__plugin_spotme_spotme__spotme_start_rep` with "$ARGUMENTS" as the hint (may be empty). Follow the returned instructions exactly: write the scaffold file, then call `mcp__plugin_spotme_spotme__spotme_exercise`. Display the full return value verbatim. Stop.',
  done: 'Call `mcp__plugin_spotme_spotme__spotme_status` to get the active exercise. Read the exercise file. Evaluate: (1) what they got right — 1–2 sentences, specific; (2) what could be better — concrete; (3) next steps only if incomplete. Do NOT show your own solution. Resume the original task. Call `mcp__plugin_spotme_spotme__spotme_end` as the LAST thing you do.',
  hint: 'Call `mcp__plugin_spotme_spotme__spotme_status` to get the active exercise. Read the exercise file. Give one targeted hint — point toward the approach without solving it. One paragraph max.',
  solve:
    "Call `mcp__plugin_spotme_spotme__spotme_status` to get the active exercise. Call `mcp__plugin_spotme_spotme__spotme_concede` to clear the marker so you can edit the file. Read the exercise file. Write the solution (complete the implementation or improve the user's work). Note the key pattern to remember. Resume original task. Call `mcp__plugin_spotme_spotme__spotme_end` as the LAST thing you do.",
  skip: 'Call `mcp__plugin_spotme_spotme__spotme_concede` to clear the marker. Then resume the original task and complete the code normally. Call `mcp__plugin_spotme_spotme__spotme_end` as the LAST thing you do.',
});
