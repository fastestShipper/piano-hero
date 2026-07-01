import { describe, it, expect } from 'vitest';
import { createScoreState, applyJudgment, applyHoldBonus, breakCombo, multiplierFor, accuracy, rating } from '../src/game/scoring';

describe('scoring', () => {
  it('multiplier steps every 10 combo, caps at 4', () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(9)).toBe(1);
    expect(multiplierFor(10)).toBe(2);
    expect(multiplierFor(30)).toBe(4);
    expect(multiplierFor(99)).toBe(4);
  });

  it('applyJudgment adds points scaled by multiplier and is immutable', () => {
    const s0 = createScoreState();
    const s1 = applyJudgment(s0, 'perfect');
    expect(s0.score).toBe(0);
    expect(s1.score).toBe(100);
    expect(s1.combo).toBe(1);
    expect(s1.counts.perfect).toBe(1);
  });

  it('uses the multiplier of the combo after increment', () => {
    let s = createScoreState();
    for (let i = 0; i < 9; i++) s = applyJudgment(s, 'perfect');
    const before = s.score;
    s = applyJudgment(s, 'perfect'); // combo becomes 10 -> x2
    expect(s.score - before).toBe(200);
  });

  it('miss resets combo, keeps maxCombo', () => {
    let s = createScoreState();
    s = applyJudgment(s, 'perfect');
    s = applyJudgment(s, 'great');
    s = applyJudgment(s, 'miss');
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(2);
    expect(s.counts.miss).toBe(1);
  });

  it('breakCombo resets combo without adding a miss count', () => {
    let s = applyJudgment(createScoreState(), 'perfect');
    s = breakCombo(s);
    expect(s.combo).toBe(0);
    expect(s.counts.miss).toBe(0);
  });

  it('hold bonus adds 50 x multiplier only when full', () => {
    const s = applyJudgment(createScoreState(), 'perfect');
    expect(applyHoldBonus(s, true).score).toBe(150);
    expect(applyHoldBonus(s, false).score).toBe(100);
  });

  it('accuracy weights perfect 1, great 0.6, good 0.3, miss 0', () => {
    let s = createScoreState();
    s = applyJudgment(s, 'perfect');
    s = applyJudgment(s, 'miss');
    expect(accuracy(s)).toBeCloseTo(0.5);
    expect(accuracy(createScoreState())).toBe(1);
  });

  it('rates S>=0.95 A>=0.90 B>=0.80 else C', () => {
    expect(rating(0.97)).toBe('S');
    expect(rating(0.92)).toBe('A');
    expect(rating(0.85)).toBe('B');
    expect(rating(0.5)).toBe('C');
  });
});
