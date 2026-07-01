import type { ChartNote } from './chart';
import type { Judgment } from './scoring';

export interface JudgeWindows {
  perfect: number;
  great: number;
  good: number;
}

export const DEFAULT_WINDOWS: JudgeWindows = { perfect: 0.05, great: 0.1, good: 0.15 };
export const HOLD_MIN_DURATION = 0.5;

export interface TrackedNote extends ChartNote {
  id: number;
  state: 'pending' | 'hit' | 'missed';
  judgment?: Judgment;
  holding?: boolean;
}

export interface HitEvent {
  noteId: number;
  judgment: Judgment;
}

export interface HoldRelease {
  noteId: number;
  ratio: number;
  full: boolean;
}

export function classify(delta: number, w: JudgeWindows): Judgment | null {
  const abs = Math.abs(delta);
  if (abs <= w.perfect) return 'perfect';
  if (abs <= w.great) return 'great';
  if (abs <= w.good) return 'good';
  return null;
}

export class Judge {
  private tracked: TrackedNote[];
  private activeHolds = new Map<number, number>(); // midi -> noteId

  constructor(notes: readonly ChartNote[], private windows: JudgeWindows = DEFAULT_WINDOWS) {
    this.tracked = notes.map((note, id) => ({ ...note, id, state: 'pending' }));
  }

  get notes(): readonly TrackedNote[] {
    return this.tracked;
  }

  onKeyDown(midi: number, time: number): HitEvent | null {
    let best: TrackedNote | null = null;
    for (const note of this.tracked) {
      if (note.state !== 'pending' || note.midi !== midi) continue;
      if (Math.abs(note.t - time) > this.windows.good) continue;
      if (!best || Math.abs(note.t - time) < Math.abs(best.t - time)) best = note;
    }
    if (!best) return null;
    const judgment = classify(best.t - time, this.windows)!;
    best.state = 'hit';
    best.judgment = judgment;
    if (best.d >= HOLD_MIN_DURATION) {
      best.holding = true;
      this.activeHolds.set(midi, best.id);
    }
    return { noteId: best.id, judgment };
  }

  onKeyUp(midi: number, time: number): HoldRelease | null {
    const noteId = this.activeHolds.get(midi);
    if (noteId === undefined) return null;
    this.activeHolds.delete(midi);
    const note = this.tracked[noteId];
    note.holding = false;
    const ratio = Math.min(1, Math.max(0, (time - note.t) / note.d));
    return { noteId, ratio, full: ratio >= 0.9 };
  }

  advance(time: number): HitEvent[] {
    const misses: HitEvent[] = [];
    for (const note of this.tracked) {
      if (note.state !== 'pending') continue;
      if (time - note.t > this.windows.good) {
        note.state = 'missed';
        note.judgment = 'miss';
        misses.push({ noteId: note.id, judgment: 'miss' });
      }
    }
    return misses;
  }
}
