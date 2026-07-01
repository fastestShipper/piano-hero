import { describe, it, expect } from 'vitest';
import { Judge, classify, DEFAULT_WINDOWS } from '../src/game/judge';
import type { ChartNote } from '../src/game/chart';

const n = (t: number, midi: number, d = 0.25): ChartNote => ({ t, midi, d, hand: 'R' });

describe('classify', () => {
  it('maps absolute delta to judgment tiers', () => {
    expect(classify(0.03, DEFAULT_WINDOWS)).toBe('perfect');
    expect(classify(-0.05, DEFAULT_WINDOWS)).toBe('perfect');
    expect(classify(0.08, DEFAULT_WINDOWS)).toBe('great');
    expect(classify(-0.13, DEFAULT_WINDOWS)).toBe('good');
    expect(classify(0.2, DEFAULT_WINDOWS)).toBeNull();
  });
});

describe('Judge', () => {
  it('hits the nearest pending note of that midi within window', () => {
    const j = new Judge([n(1, 60), n(1.4, 60)]);
    const hit = j.onKeyDown(60, 1.42);
    expect(hit).toEqual({ noteId: 1, judgment: 'perfect' });
    expect(j.notes[1].state).toBe('hit');
    expect(j.notes[0].state).toBe('pending');
  });

  it('returns null for stray keys (no note in window)', () => {
    const j = new Judge([n(1, 60)]);
    expect(j.onKeyDown(62, 1.0)).toBeNull();
    expect(j.onKeyDown(60, 2.0)).toBeNull();
  });

  it('never hits the same note twice', () => {
    const j = new Judge([n(1, 60)]);
    expect(j.onKeyDown(60, 1.0)).not.toBeNull();
    expect(j.onKeyDown(60, 1.01)).toBeNull();
  });

  it('advance marks overdue pending notes as missed', () => {
    const j = new Judge([n(1, 60), n(3, 62)]);
    const misses = j.advance(1.2);
    expect(misses).toEqual([{ noteId: 0, judgment: 'miss' }]);
    expect(j.notes[0].state).toBe('missed');
    expect(j.advance(1.3)).toEqual([]);
  });

  it('grades hold release ratio against note duration', () => {
    const j = new Judge([n(1, 60, 1.0)]);
    j.onKeyDown(60, 1.0);
    const rel = j.onKeyUp(60, 1.95);
    expect(rel).not.toBeNull();
    expect(rel!.ratio).toBeCloseTo(0.95);
    expect(rel!.full).toBe(true);
  });

  it('short holds are not full', () => {
    const j = new Judge([n(1, 60, 1.0)]);
    j.onKeyDown(60, 1.0);
    expect(j.onKeyUp(60, 1.4)!.full).toBe(false);
  });

  it('keyup without an active hold returns null (short notes)', () => {
    const j = new Judge([n(1, 60, 0.25)]);
    j.onKeyDown(60, 1.0);
    expect(j.onKeyUp(60, 1.2)).toBeNull();
  });
});
