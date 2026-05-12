// ─── Shared types and constants ─────────────────────────────────────────────

export type Difficulty = 'lite' | 'medium' | 'hard';

export interface ExerciseState {
  active: boolean;
  unit: string;
  filePath: string;
  difficulty: Difficulty;
}

export interface SpotMeState {
  enabled: boolean;
  difficulty: Difficulty;
  every: number;
  counter: number;
  exercise: ExerciseState | null;
}

/** Tool names that count toward the exercise trigger. */
export const CODE_WRITE_TOOLS = new Set(['write', 'edit', 'patch', 'create']);

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
