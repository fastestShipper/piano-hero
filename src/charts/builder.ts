import type { Chart, Hand } from '../game/chart';
import { parseChart } from '../game/chart';

export const LEAD_IN_SECONDS = 2;

export type Row = [beat: number, midi: number, beats: number, hand: Hand];

export function song(title: string, bpm: number, difficulty: number, rows: Row[]): Chart {
  const spb = 60 / bpm;
  return parseChart({
    title,
    bpm,
    difficulty,
    audioOffset: 0,
    notes: rows.map(([beat, midi, beats, hand]) => ({
      t: LEAD_IN_SECONDS + beat * spb,
      midi,
      d: beats * spb,
      hand,
    })),
  });
}
