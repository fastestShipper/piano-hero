import * as Tone from 'tone';
import { PianoSampler } from './audio/piano';
import { KeyboardInput, eventTimeToAudioTime } from './core/input';
import { SongClock } from './core/clock';
import { Judge } from './game/judge';
import { song } from './charts/builder';
import { createStage } from './render/scene';
import { createKeyboard } from './render/keyboard3d';
import { createHighway } from './render/highway';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const stage = createStage(canvas);
const keyboard = createKeyboard(stage.scene);
const highway = createHighway(stage.scene, keyboard.laneX, keyboard.laneWidth);
window.addEventListener('resize', () => stage.resize());

// Dev harness: F1 plays a test chart through the judge (full loop lands in Task 10)
const testChart = song('Test scale', 90, 1, [
  [0, 60, 0.5, 'R'], [1, 62, 0.5, 'R'], [2, 64, 0.5, 'R'], [3, 65, 0.5, 'R'],
  [4, 67, 2, 'R'], [4, 48, 2, 'L'], [6, 64, 0.5, 'R'], [7, 60, 0.5, 'R'],
  [8, 55, 1, 'L'], [8, 64, 1, 'R'], [9.5, 61, 0.5, 'R'], [10.5, 66, 1, 'R'],
]);
const clock = new SongClock(() => Tone.now());
let judge: Judge | null = null;

window.addEventListener('keydown', (e) => {
  if (e.code === 'F1') {
    e.preventDefault();
    judge = new Judge(testChart.notes);
    clock.start();
  }
});

// Dev-only inspection hook, removed in Task 10
let debugTime: number | null = null;
(window as unknown as Record<string, unknown>).__ph = {
  time: () => clock.time,
  audioNow: () => Tone.now(),
  judgeNotes: () => (judge ? judge.notes.map((n) => `${n.midi}@${n.t.toFixed(2)}:${n.state}`) : null),
  seek: (t: number) => { debugTime = t; },
  live: () => { debugTime = null; },
};

let lastFrame = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (judge) {
    const t = debugTime ?? clock.time;
    judge.advance(t);
    highway.update(t, judge.notes);
  }
  keyboard.update(dt);
  stage.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const screens = document.getElementById('screens')!;
const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
  'background:rgba(5,7,13,0.7);color:#e8e4da;font-size:1.4rem;cursor:pointer;';
overlay.textContent = 'Haz clic para iniciar el piano';
screens.appendChild(overlay);

overlay.addEventListener('click', async () => {
  overlay.textContent = 'Cargando piano...';
  try {
    const piano = await PianoSampler.create();
    overlay.remove();
    const input = new KeyboardInput((e) => {
      if (e.type === 'on') {
        piano.noteOn(e.midi);
        keyboard.press(e.midi);
        judge?.onKeyDown(e.midi, eventTimeToAudioTime(e.timeStamp) - (clockStartAudioTime() ?? 0));
      } else {
        piano.noteOff(e.midi);
        keyboard.release(e.midi);
      }
    });
    input.attach();
  } catch (err) {
    overlay.textContent = 'No se pudo cargar el audio. Haz clic para reintentar.';
    console.error(err);
  }
});

// Song time for a raw audio timestamp: audio clock minus the song start
function clockStartAudioTime(): number | null {
  if (!clock.running) return null;
  return Tone.now() - clock.time;
}
