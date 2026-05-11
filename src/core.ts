// ─── Shared core: types, helpers, and state factory ─────────────────────────
// Used by both the OpenCode plugin and the Pi extension.

export type Difficulty = 'lite' | 'medium' | 'hard';

export interface ExerciseState {
  active: boolean;
  unit: string;
  filePath: string;
  branch: string;
  originalBranch: string;
  difficulty: Difficulty;
}

export interface SpotMeState {
  enabled: boolean;
  difficulty: Difficulty;
  every: number;
  counter: number;
  exercise: ExerciseState | null;
}

export function makeState(): SpotMeState {
  return {
    enabled: false,
    difficulty: 'medium',
    every: 2,
    counter: 0,
    exercise: null,
  };
}

export function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case 'lite':
      return 'signature + structure provided — implement the body';
    case 'medium':
      return 'signature provided — implement the logic';
    case 'hard':
      return 'spec only — design and implement from scratch';
  }
}

export function parseArgs(
  args: string,
  current: Pick<SpotMeState, 'difficulty' | 'every'>
): { difficulty: Difficulty; every: number } {
  let difficulty = current.difficulty;
  let every = current.every;
  const parts = args.trim().split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'lite' || parts[i] === 'medium' || parts[i] === 'hard') {
      difficulty = parts[i] as Difficulty;
    }
    if (parts[i] === '--every' && parts[i + 1]) {
      const n = parseInt(parts[i + 1], 10);
      if (!isNaN(n) && n >= 1) every = n;
      i++;
    }
  }
  return { difficulty, every };
}

export const CODE_WRITE_TOOLS = new Set(['write', 'edit', 'patch', 'create']);

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
    `Edit the file in your editor. Replace the \`# SPOTME:\` marker with your implementation.`,
    ``,
    `Your options:`,
    `  \`/spotme:hint\`  — get a targeted hint`,
    `  \`/spotme:solve\` — concede and let the agent finish`,
    `  \`/spotme:skip\`  — skip this exercise`,
    `  \`/spotme:done\`  — submit your implementation for review`,
  ].join('\n');
}

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

// Prompt injected when user calls /spotme:done
export function donePrompt(diff: string): string {
  return `The human has finished implementing the SpotMe exercise. Here is their diff:

\`\`\`diff
${diff}
\`\`\`

Review the implementation:
1. What they got right (1–2 sentences, specific)
2. What's missing or could be better (concrete, no vague "consider edge cases")
3. Next steps — only if the exercise is incomplete

Do NOT show your own solution. Feedback only. After the review, resume the original task.`;
}

export const HINT_PROMPT =
  'Give one targeted hint for the current SpotMe exercise. Point toward the approach without revealing the implementation. One paragraph max.';

export const SOLVE_PROMPT =
  'The human has conceded this exercise. Complete the implementation. Briefly note the key pattern they should remember. Then resume the original task.';

export const SKIP_PROMPT =
  'The human is skipping this exercise. Resume the original task and complete the code normally.';

// ─── Comment syntax helpers ────────────────────────────────────────────────

const EXT_COMMENT: Record<string, { open: string; close?: string }> = {
  // C-style single-line
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

// ─── Blocker message ──────────────────────────────────────────────────────

/**
 * Message thrown by tool.execute.before when the counter is reached.
 * Includes ordered scaffold instructions and language-appropriate comment syntax.
 */
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
    `Follow these steps in order:`,
    `1. ${scaffoldStep}`,
    `2. Call \`spotme_exercise\` with the unit name, the file path, and difficulty "${difficulty}".`,
    `3. Display the full return value of \`spotme_exercise\` verbatim to the user (do not summarize).`,
  ].join('\n');
}

/** @deprecated Use blockedMessage() instead. */
export const BLOCKED_REASON =
  '[SpotMe] Counter reached — scaffold the next unit using the `spotme_exercise` tool instead of writing it directly.';
