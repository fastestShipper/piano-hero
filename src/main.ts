import * as Tone from 'tone';
import { PianoSampler } from './audio/piano';
import { KeyboardInput, eventTimeToAudioTime } from './core/input';
import { SongClock } from './core/clock';
import { GameSession } from './game/session';
import { accuracy, multiplierFor } from './game/scoring';
import { song } from './charts/builder';
import { createStage } from './render/scene';
import { createKeyboard } from './render/keyboard3d';
import { createHighway } from './render/highway';
import { createEffects } from './render/effects';
import { createHud } from './ui/hud';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const stage = createStage(canvas);
const keyboard = createKeyboard(stage.scene);
const highway = createHighway(stage.scene, keyboard.laneX, keyboard.laneWidth);
const effects = createEffects(stage.scene);
const hud = createHud();
hud.setVisible(false);
window.addEventListener('resize', () => stage.resize());

const clock = new SongClock(() => Tone.now());
let session: GameSession | null = null;
let piano: PianoSampler | null = null;

// Dev harness: F1 plays a test chart end to end (menu replaces this in Task 11)
const testChart = song('Test scale', 90, 1, [
  [0, 60, 0.5, 'R'], [1, 62, 0.5, 'R'], [2, 64, 0.5, 'R'], [3, 65, 0.5, 'R'],
  [4, 67, 2, 'R'], [4, 48, 2, 'L'], [6, 64, 0.5, 'R'], [7, 60, 0.5, 'R'],
  [8, 55, 1, 'L'], [8, 64, 1, 'R'], [9.5, 61, 0.5, 'R'], [10.5, 66, 1, 'R'],
]);

window.addEventListener('keydown', (e) => {
  if (e.code === 'F1') {
    e.preventDefault();
    session = new GameSession(testChart);
    hud.setVisible(true);
    clock.start();
  }
});

// Dev-only inspection hook, removed in Task 11
let debugTime: number | null = null;
(window as unknown as Record<string, unknown>).__ph = {
  time: () => clock.time,
  audioNow: () => Tone.now(),
  seek: (t: number) => { debugTime = t; },
  live: () => { debugTime = null; },
};

function songTimeNow(): number {
  return debugTime ?? clock.time;
}

// Audio timestamps arrive on the audio clock; song time = audio time - song start
function toSongTime(rawAudioTime: number): number {
  if (debugTime !== null) return debugTime; // dev seek: judge at the frozen time
  return rawAudioTime - (Tone.now() - clock.time);
}

function onNoteOn(midi: number, timeStamp: number): void {
  piano?.noteOn(midi);
  keyboard.press(midi);
  if (!session || !clock.running) return;
  const t = toSongTime(eventTimeToAudioTime(timeStamp));
  const result = session.handleNoteOn(midi, t);
  const state = session.score;
  if (result.hit) {
    const note = session.notes[result.hit.noteId];
    effects.burst(keyboard.laneX(note.midi), result.hit.judgment, note.hand);
    if (result.hit.judgment === 'perfect') effects.shockwave(keyboard.laneX(note.midi));
    if (state.combo > 0 && state.combo % 10 === 0) stage.pulse();
    hud.flashJudgment(result.hit.judgment);
  }
}

function onNoteOff(midi: number, timeStamp: number): void {
  piano?.noteOff(midi);
  keyboard.release(midi);
  if (!session || !clock.running) return;
  session.handleNoteOff(midi, toSongTime(eventTimeToAudioTime(timeStamp)));
}

let lastFrame = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (session) {
    const t = songTimeNow();
    const misses = session.sweep(t);
    if (misses.length > 0) hud.flashJudgment('miss');
    highway.update(t, session.notes);
    const state = session.score;
    stage.setComboTier(multiplierFor(state.combo) - 1);
    hud.update(state.score, state.combo, multiplierFor(state.combo), accuracy(state));
  }
  keyboard.update(dt);
  effects.update(dt);
  stage.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const screens = document.getElementById('screens')!;
const overlay = document.createElement('div');
overlay.className = 'screen-overlay';
overlay.textContent = 'Haz clic para iniciar el piano';
screens.appendChild(overlay);

overlay.addEventListener('click', async () => {
  overlay.textContent = 'Cargando piano...';
  try {
    piano = await PianoSampler.create();
    overlay.remove();
    const input = new KeyboardInput((e) => {
      if (e.type === 'on') onNoteOn(e.midi, e.timeStamp);
      else onNoteOff(e.midi, e.timeStamp);
    });
    input.attach();
  } catch (err) {
    overlay.textContent = 'No se pudo cargar el audio. Haz clic para reintentar.';
    console.error(err);
  }
});
