import type { Chart } from '../game/chart';
import { song, type Row } from './builder';

// Himno de la Alegria (Beethoven), right hand only, difficulty 1
const odeRows: Row[] = [
  [0, 64, 0.9, 'R'], [1, 64, 0.9, 'R'], [2, 65, 0.9, 'R'], [3, 67, 0.9, 'R'],
  [4, 67, 0.9, 'R'], [5, 65, 0.9, 'R'], [6, 64, 0.9, 'R'], [7, 62, 0.9, 'R'],
  [8, 60, 0.9, 'R'], [9, 60, 0.9, 'R'], [10, 62, 0.9, 'R'], [11, 64, 0.9, 'R'],
  [12, 64, 1.4, 'R'], [13.5, 62, 0.4, 'R'], [14, 62, 2, 'R'],
  [16, 64, 0.9, 'R'], [17, 64, 0.9, 'R'], [18, 65, 0.9, 'R'], [19, 67, 0.9, 'R'],
  [20, 67, 0.9, 'R'], [21, 65, 0.9, 'R'], [22, 64, 0.9, 'R'], [23, 62, 0.9, 'R'],
  [24, 60, 0.9, 'R'], [25, 60, 0.9, 'R'], [26, 62, 0.9, 'R'], [27, 64, 0.9, 'R'],
  [28, 62, 1.4, 'R'], [29.5, 60, 0.4, 'R'], [30, 60, 2, 'R'],
];

// Para Elisa (Beethoven), transposed down one octave to fit C3-C5, difficulty 2
const eliseRun = (start: number): Row[] => [
  [start, 64, 0.4, 'R'], [start + 0.5, 63, 0.4, 'R'],
  [start + 1, 64, 0.4, 'R'], [start + 1.5, 63, 0.4, 'R'],
  [start + 2, 64, 0.4, 'R'], [start + 2.5, 59, 0.4, 'R'],
  [start + 3, 62, 0.4, 'R'], [start + 3.5, 60, 0.4, 'R'],
];
const eliseRows: Row[] = [
  ...eliseRun(0),
  [4, 57, 1, 'R'], [4, 48, 1, 'L'], [5, 52, 0.5, 'L'], [5.5, 57, 0.5, 'L'],
  [6, 59, 1, 'R'], [6, 52, 1, 'L'], [7, 56, 0.5, 'L'], [7.5, 59, 0.5, 'L'],
  [8, 57, 1.5, 'R'], [8, 48, 1.5, 'L'],
  ...eliseRun(10),
  [14, 57, 1, 'R'], [14, 48, 1, 'L'], [15, 52, 0.5, 'L'],
  [16, 59, 1, 'R'], [16, 52, 1, 'L'],
  [18, 57, 2, 'R'], [18, 48, 2, 'L'],
];

// Canon en Do (Pachelbel, transposed to C major, simplified), difficulty 2
const canonBass: number[] = [48, 55, 57, 52, 53, 48, 53, 55];
const canonRows: Row[] = [];
for (let pass = 0; pass < 2; pass++) {
  canonBass.forEach((midi, i) => {
    canonRows.push([pass * 16 + i * 2, midi, 1.9, 'L']);
  });
}
const canonMelodyHalves = [64, 62, 60, 59, 57, 55, 57, 59];
canonMelodyHalves.forEach((midi, i) => {
  canonRows.push([i * 2, midi, 1.9, 'R']);
});
const canonMelodyQuarters = [60, 59, 57, 55, 53, 52, 53, 55, 64, 62, 60, 59];
canonMelodyQuarters.forEach((midi, i) => {
  canonRows.push([16 + i, midi, 0.9, 'R']);
});
canonRows.push([28, 60, 4, 'R'], [28, 48, 4, 'L']);

export const SONGS: Chart[] = [
  song('Himno de la Alegria', 100, 1, odeRows),
  song('Para Elisa', 72, 2, eliseRows),
  song('Canon en Do', 70, 2, canonRows),
];
