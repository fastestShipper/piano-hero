import * as Tone from 'tone';
import { PianoSampler } from './audio/piano';
import { KeyboardInput, eventTimeToAudioTime } from './core/input';
import { SongClock } from './core/clock';
import { GameSession } from './game/session';
import type { Chart } from './game/chart';
import { accuracy, multiplierFor } from './game/scoring';
import { LEAD_IN_SECONDS } from './charts/builder';
import { SONGS } from './charts/index';
import { createStage } from './render/scene';
import { createKeyboard } from './render/keyboard3d';
import { createHighway } from './render/highway';
import { createEffects } from './render/effects';
import { createHud } from './ui/hud';
import { createScreens } from './ui/screens';
import { runCalibration, loadCalibration } from './ui/calibration';

type AppState = 'menu' | 'loading' | 'playing' | 'results' | 'freeplay' | 'calibrating';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const stage = createStage(canvas);
const keyboard = createKeyboard(stage.scene);
const highway = createHighway(stage.scene, keyboard.laneX, keyboard.laneWidth);
const effects = createEffects(stage.scene);
const hud = createHud();
const screens = createScreens();
hud.setVisible(false);
window.addEventListener('resize', () => stage.resize());

const clock = new SongClock(() => Tone.now());
let state: AppState = 'menu';
let session: GameSession | null = null;
let currentChart: Chart | null = null;
let piano: PianoSampler | null = null;
let paused = false;

// Dev-only time override used by automated visual QA
let debugTime: number | null = null;
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__ph = {
    seek: (t: number) => { debugTime = t; },
    live: () => { debugTime = null; },
    time: () => clock.time,
  };
}

async function ensureAudio(): Promise<boolean> {
  if (piano) return true;
  screens.showLoading('Cargando piano...');
  try {
    piano = await PianoSampler.create();
    return true;
  } catch (err) {
    console.error('sampler load failed', err);
    return false;
  }
}

function showMenu(): void {
  state = 'menu';
  paused = false;
  session = null;
  hud.setVisible(false);
  screens.hideAll();
  stage.setComboTier(0);
  screens.showMenu(SONGS, startSong, startFreePlay, startCalibration);
}

async function startSong(chart: Chart): Promise<void> {
  state = 'loading';
  if (!(await ensureAudio())) {
    screens.showError('No se pudo cargar el audio.', () => void startSong(chart));
    return;
  }
  currentChart = chart;
  session = new GameSession(chart, undefined, loadCalibration());
  screens.hideAll();
  hud.setVisible(true);
  hud.update(0, 0, 1, 1);
  paused = false;
  state = 'playing';
  clock.start();
}

async function startFreePlay(): Promise<void> {
  state = 'loading';
  if (!(await ensureAudio())) {
    screens.showError('No se pudo cargar el audio.', () => void startFreePlay());
    return;
  }
  session = null;
  screens.hideAll();
  hud.setVisible(false);
  state = 'freeplay';
}

async function startCalibration(): Promise<void> {
  state = 'loading';
  if (!(await ensureAudio())) {
    screens.showError('No se pudo cargar el audio.', () => void startCalibration());
    return;
  }
  screens.hideAll();
  state = 'calibrating';
  runCalibration(() => showMenu());
}

function finishSong(): void {
  if (!session || !currentChart) return;
  state = 'results';
  hud.setVisible(false);
  screens.hideCountdown();
  const data = { chart: currentChart, score: session.score };
  session = null;
  stage.setComboTier(0);
  screens.showResults(
    data,
    () => void startSong(data.chart),
    showMenu,
  );
}

function togglePause(): void {
  if (state !== 'playing') return;
  paused = !paused;
  if (paused) clock.pause();
  else clock.resume();
  screens.showPause(paused);
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (state === 'playing') togglePause();
  else if (state === 'freeplay') showMenu();
});

// Song time for judgment: raw audio timestamp mapped onto the song clock
function toSongTime(rawAudioTime: number): number {
  if (debugTime !== null) return debugTime;
  return rawAudioTime - (Tone.now() - clock.time);
}

function onNoteOn(midi: number, timeStamp: number): void {
  piano?.noteOn(midi);
  keyboard.press(midi);
  if (state !== 'playing' || paused || !session) return;
  const result = session.handleNoteOn(midi, toSongTime(eventTimeToAudioTime(timeStamp)));
  if (result.hit) {
    const note = session.notes[result.hit.noteId];
    const scoreState = session.score;
    effects.burst(keyboard.laneX(note.midi), result.hit.judgment, note.hand);
    if (result.hit.judgment === 'perfect') effects.shockwave(keyboard.laneX(note.midi));
    if (scoreState.combo > 0 && scoreState.combo % 10 === 0) stage.pulse();
    hud.flashJudgment(result.hit.judgment);
  }
}

function onNoteOff(midi: number, timeStamp: number): void {
  piano?.noteOff(midi);
  keyboard.release(midi);
  if (state !== 'playing' || paused || !session) return;
  session.handleNoteOff(midi, toSongTime(eventTimeToAudioTime(timeStamp)));
}

const input = new KeyboardInput((e) => {
  if (e.type === 'on') onNoteOn(e.midi, e.timeStamp);
  else onNoteOff(e.midi, e.timeStamp);
});
input.attach();

let lastFrame = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state === 'playing' && session && !paused) {
    const t = debugTime ?? clock.time;
    if (t < LEAD_IN_SECONDS) {
      screens.showCountdown(Math.ceil(LEAD_IN_SECONDS - t));
    } else {
      screens.hideCountdown();
    }
    const misses = session.sweep(t);
    if (misses.length > 0) hud.flashJudgment('miss');
    highway.update(t, session.notes);
    const scoreState = session.score;
    stage.setComboTier(multiplierFor(scoreState.combo) - 1);
    hud.update(scoreState.score, scoreState.combo, multiplierFor(scoreState.combo), accuracy(scoreState));
    if (session.isFinished(t)) finishSong();
  }

  keyboard.update(dt);
  effects.update(dt);
  stage.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// WebGL context loss: pause and let the user resume once restored
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  if (state === 'playing' && !paused) togglePause();
});

showMenu();
