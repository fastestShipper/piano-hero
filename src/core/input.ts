import * as Tone from 'tone';
import { KEY_TO_MIDI } from './mapping';

export interface NoteInputEvent {
  midi: number;
  type: 'on' | 'off';
  timeStamp: number;
}

// Maps a DOM event timeStamp (ms since timeOrigin) onto the audio clock,
// so judgment sees when the key was pressed, not when the frame processed it.
export function eventTimeToAudioTime(timeStampMs: number): number {
  return Tone.now() - (performance.now() - timeStampMs) / 1000;
}

export class KeyboardInput {
  private downCodes = new Set<string>();

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const midi = KEY_TO_MIDI[e.code];
    if (midi === undefined || this.downCodes.has(e.code)) return;
    this.downCodes.add(e.code);
    e.preventDefault();
    this.handler({ midi, type: 'on', timeStamp: e.timeStamp });
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (!this.downCodes.delete(e.code)) return;
    const midi = KEY_TO_MIDI[e.code];
    if (midi === undefined) return;
    this.handler({ midi, type: 'off', timeStamp: e.timeStamp });
  };

  constructor(private handler: (e: NoteInputEvent) => void) {}

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
