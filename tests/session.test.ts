import { describe, it, expect } from 'vitest';
import { GameSession } from '../src/game/session';
import type { Chart } from '../src/game/chart';

const chart: Chart = {
  title: 'T', bpm: 100, difficulty: 1, audioOffset: 0,
  notes: [
    { t: 1, midi: 60, d: 0.25, hand: 'R' },
    { t: 2, midi: 64, d: 1.0, hand: 'R' },
  ],
};

describe('GameSession', () => {
  it('scores a perfect hit', () => {
    const s = new GameSession(chart);
    const r = s.handleNoteOn(60, 1.01);
    expect(r.hit!.judgment).toBe('perfect');
    expect(s.score.score).toBe(100);
    expect(s.score.combo).toBe(1);
  });

  it('stray key breaks combo without a miss count', () => {
    const s = new GameSession(chart);
    s.handleNoteOn(60, 1.0);
    const r = s.handleNoteOn(50, 1.1);
    expect(r.hit).toBeNull();
    expect(r.strayBrokeCombo).toBe(true);
    expect(s.score.combo).toBe(0);
    expect(s.score.counts.miss).toBe(0);
  });

  it('applies calibration offset to hit times', () => {
    const s = new GameSession(chart, undefined, 0.1); // player hits 100 ms late consistently
    expect(s.handleNoteOn(60, 1.1).hit!.judgment).toBe('perfect');
  });

  it('full hold adds bonus on release', () => {
    const s = new GameSession(chart);
    s.handleNoteOn(64, 2.0);
    const before = s.score.score;
    s.handleNoteOff(64, 2.95);
    expect(s.score.score).toBe(before + 50);
  });

  it('sweep produces misses and finishes after the last note', () => {
    const s = new GameSession(chart);
    const misses = s.sweep(10);
    expect(misses.length).toBe(2);
    expect(s.score.counts.miss).toBe(2);
    expect(s.isFinished(10)).toBe(true);
    expect(s.isFinished(2.5)).toBe(false);
  });
});
