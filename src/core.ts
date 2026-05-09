// ─── Shared core: types, helpers, and state factory ─────────────────────────
// Used by both the OpenCode plugin and the Pi extension.

export type Difficulty = "lite" | "medium" | "hard";

export interface ExerciseState {
  active: boolean;
  unit: string;
  filePath: string;
  branch: string;
  originalBranch: string;
  difficulty: Difficulty;
}

export interface SpotterState {
  enabled: boolean;
  difficulty: Difficulty;
  every: number;
  counter: number;
  exercise: ExerciseState | null;
}

export function makeState(): SpotterState {
  return {
    enabled: false,
    difficulty: "medium",
    every: 2,
    counter: 0,
    exercise: null,
  };
}

export function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case "lite":   return "signature + structure provided — implement the body";
    case "medium": return "signature provided — implement the logic";
    case "hard":   return "spec only — design and implement from scratch";
  }
}

export function parseArgs(
  args: string,
  current: Pick<SpotterState, "difficulty" | "every">
): { difficulty: Difficulty; every: number } {
  let difficulty = current.difficulty;
  let every = current.every;
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

export const CODE_WRITE_TOOLS = new Set(["write", "edit", "patch", "create"]);

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
    `Edit the file in your editor. Replace the \`# SPOTTER:\` marker with your implementation.`,
    `When done: \`/spotter:done\` · Hint: \`/spotter:hint\` · Concede: \`/spotter:solve\` · Skip: \`/spotter:skip\``,
  ].join("\n");
}

export function statusMessage(state: SpotterState): string {
  const lines = [
    `Spotter: ${state.enabled ? "🟢 on" : "⚪ off"}`,
    `Difficulty: ${state.difficulty}`,
    `Trigger every: ${state.every} code write(s)`,
    `Counter: ${state.counter}/${state.every}`,
  ];
  if (state.exercise?.active) {
    lines.push(`Active exercise: ${state.exercise.unit} (${state.exercise.filePath})`);
  }
  return lines.join("\n");
}

// Prompt injected when user calls /spotter:done
export function donePrompt(diff: string): string {
  return `The human has finished implementing the Spotter exercise. Here is their diff:

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
  "Give one targeted hint for the current Spotter exercise. Point toward the approach without revealing the implementation. One paragraph max.";

export const SOLVE_PROMPT =
  "The human has conceded this exercise. Complete the implementation. Briefly note the key pattern they should remember. Then resume the original task.";

export const SKIP_PROMPT =
  "The human is skipping this exercise. Resume the original task and complete the code normally.";

export const BLOCKED_REASON =
  "[Spotter] Counter reached — scaffold the next unit using the `spotter_exercise` tool instead of writing it directly.";
