import { PianoSampler } from './audio/piano';
import { KeyboardInput } from './core/input';
import { createStage } from './render/scene';
import { createKeyboard } from './render/keyboard3d';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const stage = createStage(canvas);
const keyboard = createKeyboard(stage.scene);
window.addEventListener('resize', () => stage.resize());

let lastFrame = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  keyboard.update(dt);
  stage.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Temporary free-play harness; replaced by the full app in later tasks.
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
