import { PianoSampler } from './audio/piano';
import { KeyboardInput } from './core/input';
import { midiToName } from './core/mapping';

// Temporary free-play harness; replaced by the full app in later tasks.
const screens = document.getElementById('screens')!;
const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
  'background:rgba(5,7,13,0.9);color:#e8e4da;font-size:1.4rem;cursor:pointer;';
overlay.textContent = 'Haz clic para iniciar el piano';
screens.appendChild(overlay);

overlay.addEventListener(
  'click',
  async () => {
    overlay.textContent = 'Cargando piano...';
    try {
      const piano = await PianoSampler.create();
      overlay.remove();
      const input = new KeyboardInput((e) => {
        if (e.type === 'on') piano.noteOn(e.midi);
        else piano.noteOff(e.midi);
        console.log(`${e.type} ${midiToName(e.midi)}`);
      });
      input.attach();
    } catch (err) {
      overlay.textContent = 'No se pudo cargar el audio. Haz clic para reintentar.';
      console.error(err);
    }
  },
  { once: false },
);
