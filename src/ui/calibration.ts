import * as Tone from 'tone';
import { eventTimeToAudioTime } from '../core/input';

const STORAGE_KEY = 'ph.calibration';
const BEAT_INTERVAL = 0.6;
const COUNT_IN_BEATS = 4;
const MEASURED_TAPS = 8;
const MAX_OFFSET = 0.3;

export function loadCalibration(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const value = raw === null ? 0 : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function saveCalibration(offset: number): void {
  localStorage.setItem(STORAGE_KEY, String(offset));
}

// Plays a metronome; the player taps Space on each beat after the count-in.
// The mean tap error becomes the player's audio+input latency offset.
export function runCalibration(onDone: (offsetSeconds: number) => void): void {
  const root = document.getElementById('screens')!;
  const overlay = document.createElement('div');
  overlay.className = 'screen screen-loading';
  const title = document.createElement('p');
  title.textContent = 'Presiona ESPACIO al ritmo del metronomo';
  const progress = document.createElement('span');
  progress.className = 'menu-help';
  progress.textContent = `Escucha los ${COUNT_IN_BEATS} golpes de entrada...`;
  overlay.append(title, progress);
  root.appendChild(overlay);

  const synth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
  }).toDestination();
  synth.volume.value = -8;

  const startAt = Tone.now() + 0.5;
  const totalBeats = COUNT_IN_BEATS + MEASURED_TAPS + 1;
  for (let i = 0; i < totalBeats; i++) {
    synth.triggerAttackRelease(i % 4 === 0 ? 'C6' : 'G5', 0.05, startAt + i * BEAT_INTERVAL);
  }

  const offsets: number[] = [];

  function finish(): void {
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
    synth.dispose();
    const mean = offsets.length > 0
      ? offsets.reduce((a, b) => a + b, 0) / offsets.length
      : 0;
    const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, mean));
    saveCalibration(clamped);
    onDone(clamped);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.code !== 'Space') return;
    e.preventDefault();
    e.stopPropagation();
    const tap = eventTimeToAudioTime(e.timeStamp);
    const beatIndex = Math.round((tap - startAt) / BEAT_INTERVAL);
    if (beatIndex < COUNT_IN_BEATS) return; // still in count-in
    offsets.push(tap - (startAt + beatIndex * BEAT_INTERVAL));
    progress.textContent = `${offsets.length} de ${MEASURED_TAPS}`;
    if (offsets.length >= MEASURED_TAPS) finish();
  }

  window.addEventListener('keydown', onKey, true);
}
