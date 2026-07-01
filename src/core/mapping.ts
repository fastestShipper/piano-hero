export const MIDI_MIN = 48;
export const MIDI_MAX = 72;

export const KEY_TO_MIDI: Readonly<Record<string, number>> = {
  KeyZ: 48, KeyS: 49, KeyX: 50, KeyD: 51, KeyC: 52, KeyV: 53, KeyG: 54,
  KeyB: 55, KeyH: 56, KeyN: 57, KeyJ: 58, KeyM: 59, Comma: 60,
  KeyQ: 60, Digit2: 61, KeyW: 62, Digit3: 63, KeyE: 64, KeyR: 65,
  Digit5: 66, KeyT: 67, Digit6: 68, KeyY: 69, Digit7: 70, KeyU: 71, KeyI: 72,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(midi % 12);
}

export function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

const PREFERRED_LABEL: Record<number, string> = {};
for (const [code, midi] of Object.entries(KEY_TO_MIDI)) {
  const label = code.replace(/^Key|^Digit/, '').replace('Comma', ',');
  // Q row wins for midi 60 so both octaves read naturally on screen
  if (!(midi in PREFERRED_LABEL) || code === 'KeyQ') PREFERRED_LABEL[midi] = label;
}

export function labelForMidi(midi: number): string {
  return PREFERRED_LABEL[midi] ?? '';
}
