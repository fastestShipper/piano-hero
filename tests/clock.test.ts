import { describe, it, expect } from 'vitest';
import { SongClock } from '../src/core/clock';

describe('SongClock', () => {
  it('tracks elapsed time from start using the injected clock', () => {
    let t = 100;
    const c = new SongClock(() => t);
    c.start();
    t = 103.5;
    expect(c.time).toBeCloseTo(3.5);
    expect(c.running).toBe(true);
  });

  it('freezes during pause and resumes without jump', () => {
    let t = 0;
    const c = new SongClock(() => t);
    c.start();
    t = 2;
    c.pause();
    t = 10;
    expect(c.time).toBeCloseTo(2);
    expect(c.running).toBe(false);
    c.resume();
    t = 11;
    expect(c.time).toBeCloseTo(3);
  });

  it('stop resets to zero and not running', () => {
    let t = 0;
    const c = new SongClock(() => t);
    c.start();
    t = 5;
    c.stop();
    expect(c.time).toBe(0);
    expect(c.running).toBe(false);
  });
});
