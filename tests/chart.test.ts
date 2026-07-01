import { describe, it, expect } from 'vitest';
import { parseChart, ChartError } from '../src/game/chart';
import { song, LEAD_IN_SECONDS } from '../src/charts/builder';

describe('parseChart', () => {
  const valid = {
    title: 'Test', bpm: 100, difficulty: 1, audioOffset: 0,
    notes: [
      { t: 1, midi: 60, d: 0.5, hand: 'R' },
      { t: 0, midi: 55, d: 0.25, hand: 'L' },
    ],
  };

  it('accepts a valid chart and sorts notes by time', () => {
    const c = parseChart(valid);
    expect(c.notes[0].t).toBe(0);
    expect(c.notes[1].midi).toBe(60);
  });

  it('rejects out-of-range midi', () => {
    const high = { ...valid, notes: [{ t: 0, midi: 90, d: 1, hand: 'R' }] };
    expect(() => parseChart(high)).toThrow(ChartError);
    const low = { ...valid, notes: [{ t: 0, midi: 48, d: 1, hand: 'R' }] };
    expect(() => parseChart(low)).toThrow(ChartError);
  });

  it('rejects non-positive duration and negative time', () => {
    expect(() => parseChart({ ...valid, notes: [{ t: -1, midi: 60, d: 1, hand: 'R' }] })).toThrow(ChartError);
    expect(() => parseChart({ ...valid, notes: [{ t: 0, midi: 60, d: 0, hand: 'R' }] })).toThrow(ChartError);
  });

  it('rejects missing fields', () => {
    expect(() => parseChart({ title: 'x' })).toThrow(ChartError);
  });
});

describe('song builder', () => {
  it('converts beats to seconds with lead-in', () => {
    const c = song('S', 120, 1, [[0, 60, 1, 'R'], [2, 62, 0.5, 'R']]);
    expect(c.notes[0].t).toBe(LEAD_IN_SECONDS);
    expect(c.notes[1].t).toBeCloseTo(LEAD_IN_SECONDS + 1.0);
    expect(c.notes[1].d).toBeCloseTo(0.25);
  });
});
