export type Judgment = 'perfect' | 'great' | 'good' | 'miss';

export interface ScoreState {
  readonly score: number;
  readonly combo: number;
  readonly maxCombo: number;
  readonly counts: Readonly<Record<Judgment, number>>;
}

const BASE_POINTS: Record<Judgment, number> = { perfect: 100, great: 60, good: 30, miss: 0 };
const ACCURACY_WEIGHT: Record<Judgment, number> = { perfect: 1, great: 0.6, good: 0.3, miss: 0 };
const HOLD_BONUS = 50;

export function createScoreState(): ScoreState {
  return { score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 } };
}

export function multiplierFor(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 10));
}

export function applyJudgment(state: ScoreState, j: Judgment): ScoreState {
  const combo = j === 'miss' ? 0 : state.combo + 1;
  return {
    score: state.score + BASE_POINTS[j] * multiplierFor(combo),
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    counts: { ...state.counts, [j]: state.counts[j] + 1 },
  };
}

export function applyHoldBonus(state: ScoreState, full: boolean): ScoreState {
  if (!full) return state;
  return { ...state, score: state.score + HOLD_BONUS * multiplierFor(state.combo) };
}

export function breakCombo(state: ScoreState): ScoreState {
  return { ...state, combo: 0 };
}

export function accuracy(state: ScoreState): number {
  const total = state.counts.perfect + state.counts.great + state.counts.good + state.counts.miss;
  if (total === 0) return 1;
  const weighted = (Object.keys(ACCURACY_WEIGHT) as Judgment[])
    .reduce((sum, j) => sum + ACCURACY_WEIGHT[j] * state.counts[j], 0);
  return weighted / total;
}

export function rating(acc: number): 'S' | 'A' | 'B' | 'C' {
  if (acc >= 0.95) return 'S';
  if (acc >= 0.9) return 'A';
  if (acc >= 0.8) return 'B';
  return 'C';
}
