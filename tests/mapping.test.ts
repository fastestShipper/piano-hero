import { describe, it, expect } from 'vitest';
import { KEY_TO_MIDI, isBlackKey, midiToName, labelForMidi, MIDI_MIN, MIDI_MAX } from '../src/core/mapping';

describe('mapping', () => {
  it('puts middle C on B, bottom row runs F3 to A4', () => {
    expect(KEY_TO_MIDI.KeyB).toBe(60);
    expect(KEY_TO_MIDI.KeyZ).toBe(53);
    expect(KEY_TO_MIDI.KeyV).toBe(59);
    expect(KEY_TO_MIDI.KeyN).toBe(62);
    expect(KEY_TO_MIDI.KeyM).toBe(64);
    expect(KEY_TO_MIDI.Slash).toBe(69);
  });

  it('bottom-row blacks follow the physical piano pattern (G and K unused)', () => {
    expect(KEY_TO_MIDI.KeyS).toBe(54);
    expect(KEY_TO_MIDI.KeyD).toBe(56);
    expect(KEY_TO_MIDI.KeyF).toBe(58);
    expect(KEY_TO_MIDI.KeyH).toBe(61);
    expect(KEY_TO_MIDI.KeyJ).toBe(63);
    expect(KEY_TO_MIDI.KeyL).toBe(66);
    expect(KEY_TO_MIDI.Semicolon).toBe(68);
    expect(KEY_TO_MIDI.KeyG).toBeUndefined();
    expect(KEY_TO_MIDI.KeyK).toBeUndefined();
  });

  it('top row still offers C4 at E and reaches C5 at P', () => {
    expect(KEY_TO_MIDI.KeyE).toBe(60);
    expect(KEY_TO_MIDI.KeyQ).toBe(57);
    expect(KEY_TO_MIDI.KeyI).toBe(69);
    expect(KEY_TO_MIDI.KeyP).toBe(72);
  });

  it('covers every midi note in range', () => {
    const covered = new Set(Object.values(KEY_TO_MIDI));
    for (let m = MIDI_MIN; m <= MIDI_MAX; m++) expect(covered.has(m)).toBe(true);
  });

  it('identifies black keys', () => {
    expect(isBlackKey(54)).toBe(true);
    expect(isBlackKey(60)).toBe(false);
    expect(isBlackKey(66)).toBe(true);
  });

  it('names notes', () => {
    expect(midiToName(53)).toBe('F3');
    expect(midiToName(60)).toBe('C4');
    expect(midiToName(61)).toBe('C#4');
    expect(midiToName(72)).toBe('C5');
  });

  it('labels use the bottom row through A4 and the top row above it', () => {
    expect(labelForMidi(53)).toBe('Z');
    expect(labelForMidi(60)).toBe('B');
    expect(labelForMidi(61)).toBe('H');
    expect(labelForMidi(64)).toBe('M');
    expect(labelForMidi(65)).toBe(',');
    expect(labelForMidi(69)).toBe('/');
    expect(labelForMidi(70)).toBe('9');
    expect(labelForMidi(72)).toBe('P');
  });
});
