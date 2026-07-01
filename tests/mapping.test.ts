import { describe, it, expect } from 'vitest';
import { KEY_TO_MIDI, isBlackKey, midiToName, labelForMidi, MIDI_MIN, MIDI_MAX } from '../src/core/mapping';

describe('mapping', () => {
  it('centers middle C: E is C4, bottom row is the C3 octave', () => {
    expect(KEY_TO_MIDI.KeyZ).toBe(48);
    expect(KEY_TO_MIDI.KeyS).toBe(49);
    expect(KEY_TO_MIDI.KeyM).toBe(59);
    expect(KEY_TO_MIDI.Comma).toBe(60);
    expect(KEY_TO_MIDI.KeyE).toBe(60);
    expect(KEY_TO_MIDI.Digit4).toBe(61);
    expect(KEY_TO_MIDI.KeyP).toBe(72);
  });

  it('overlaps A3-B3 on both rows for comfortable chords around middle C', () => {
    expect(KEY_TO_MIDI.KeyQ).toBe(57);
    expect(KEY_TO_MIDI.KeyN).toBe(57);
    expect(KEY_TO_MIDI.KeyW).toBe(59);
    expect(KEY_TO_MIDI.Slash).toBe(64);
  });

  it('covers every midi note in range', () => {
    const covered = new Set(Object.values(KEY_TO_MIDI));
    for (let m = MIDI_MIN; m <= MIDI_MAX; m++) expect(covered.has(m)).toBe(true);
  });

  it('identifies black keys', () => {
    expect(isBlackKey(49)).toBe(true);
    expect(isBlackKey(48)).toBe(false);
    expect(isBlackKey(66)).toBe(true);
  });

  it('names notes', () => {
    expect(midiToName(48)).toBe('C3');
    expect(midiToName(61)).toBe('C#4');
    expect(midiToName(72)).toBe('C5');
  });

  it('labels use bottom row below middle C and top row from middle C up', () => {
    expect(labelForMidi(48)).toBe('Z');
    expect(labelForMidi(57)).toBe('N');
    expect(labelForMidi(60)).toBe('E');
    expect(labelForMidi(61)).toBe('4');
    expect(labelForMidi(72)).toBe('P');
  });
});
