import { MIDI_MIN, MIDI_MAX } from '../core/mapping';

export type Hand = 'R' | 'L';

export interface ChartNote {
  t: number;
  midi: number;
  d: number;
  hand: Hand;
}

export interface Chart {
  title: string;
  bpm: number;
  difficulty: number;
  audioOffset: number;
  notes: readonly ChartNote[];
}

export class ChartError extends Error {}

function fail(msg: string): never {
  throw new ChartError(msg);
}

export function parseChart(data: unknown): Chart {
  if (typeof data !== 'object' || data === null) fail('chart must be an object');
  const c = data as Record<string, unknown>;
  if (typeof c.title !== 'string' || typeof c.bpm !== 'number' ||
      typeof c.difficulty !== 'number' || typeof c.audioOffset !== 'number' ||
      !Array.isArray(c.notes)) fail('chart missing required fields');
  const notes = c.notes.map((n, i) => {
    const note = n as Record<string, unknown>;
    const { t, midi, d, hand } = note;
    if (typeof t !== 'number' || t < 0) fail(`note ${i}: invalid time`);
    if (typeof midi !== 'number' || midi < MIDI_MIN || midi > MIDI_MAX) fail(`note ${i}: midi out of range`);
    if (typeof d !== 'number' || d <= 0) fail(`note ${i}: invalid duration`);
    if (hand !== 'R' && hand !== 'L') fail(`note ${i}: invalid hand`);
    return { t, midi, d, hand } as ChartNote;
  });
  notes.sort((a, b) => a.t - b.t);
  return { title: c.title, bpm: c.bpm, difficulty: c.difficulty, audioOffset: c.audioOffset, notes };
}
