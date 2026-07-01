export const MIDI_MIN = 48;
export const MIDI_MAX = 72;

// Piano-style layout centered on middle C (user feedback: chords around C4
// must be comfortable). Bottom row = C3 octave, top row = C4 octave starting
// at E, with an A3-B3 overlap zone reachable by either hand. The digit keys
// 4 5 7 8 9 sit physically between the letters exactly like black keys.
export const KEY_TO_MIDI: Readonly<Record<string, number>> = {
  // Bottom row: C3..B3 plus extension into the middle-C zone
  KeyZ: 48, KeyS: 49, KeyX: 50, KeyD: 51, KeyC: 52, KeyV: 53, KeyG: 54,
  KeyB: 55, KeyH: 56, KeyN: 57, KeyJ: 58, KeyM: 59,
  Comma: 60, KeyL: 61, Period: 62, Semicolon: 63, Slash: 64,
  // Top row: overlap A3..B3, then C4..C5 centered on the keyboard
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

// On-screen labels: bottom row identifies the low octave, top row identifies
// middle C and above, matching how each hand naturally sits
const LABEL_BY_MIDI: Record<number, string> = {
  48: 'Z', 49: 'S', 50: 'X', 51: 'D', 52: 'C', 53: 'V', 54: 'G',
  55: 'B', 56: 'H', 57: 'N', 58: 'J', 59: 'M',
  60: 'E', 61: '4', 62: 'R', 63: '5', 64: 'T', 65: 'Y',
  66: '7', 67: 'U', 68: '8', 69: 'I', 70: '9', 71: 'O', 72: 'P',
};

export function labelForMidi(midi: number): string {
  return LABEL_BY_MIDI[midi] ?? '';
}
