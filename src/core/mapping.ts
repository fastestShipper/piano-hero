export const MIDI_MIN = 53; // F3
export const MIDI_MAX = 72; // C5

// Piano-style layout with middle C on B (user request): the bottom row is one
// continuous run F3..A4 centered on B = C4, and the home-row keys sit exactly
// where the black keys fall (G and K stay unused where the piano has gaps).
// The top row remains an alternate C4 octave (E = C4) reaching C5 at P.
export const KEY_TO_MIDI: Readonly<Record<string, number>> = {
  // Bottom row: F3..A4, middle C on B
  KeyZ: 53, KeyS: 54, KeyX: 55, KeyD: 56, KeyC: 57, KeyF: 58, KeyV: 59,
  KeyB: 60, KeyH: 61, KeyN: 62, KeyJ: 63, KeyM: 64,
  Comma: 65, KeyL: 66, Period: 67, Semicolon: 68, Slash: 69,
  // Top row: overlap A3..A4 plus the exclusive top notes A#4, B4, C5
  KeyQ: 57, Digit2: 58, KeyW: 59,
  KeyE: 60, Digit4: 61, KeyR: 62, Digit5: 63, KeyT: 64, KeyY: 65,
  Digit7: 66, KeyU: 67, Digit8: 68, KeyI: 69, Digit9: 70, KeyO: 71, KeyP: 72,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(midi % 12);
}

export function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// On-screen labels: the continuous bottom row identifies F3..A4 (one hand
// position never mixes rows mid-phrase); the top row owns A#4, B4, C5
const LABEL_BY_MIDI: Record<number, string> = {
  53: 'Z', 54: 'S', 55: 'X', 56: 'D', 57: 'C', 58: 'F', 59: 'V',
  60: 'B', 61: 'H', 62: 'N', 63: 'J', 64: 'M',
  65: ',', 66: 'L', 67: '.', 68: ';', 69: '/',
  70: '9', 71: 'O', 72: 'P',
};

export function labelForMidi(midi: number): string {
  return LABEL_BY_MIDI[midi] ?? '';
}
