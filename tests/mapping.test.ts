import { describe, it, expect } from 'vitest';
import { KEY_TO_MIDI, isBlackKey, midiToName, labelForMidi, MIDI_MIN, MIDI_MAX } from '../src/core/mapping';

describe('mapping', () => {
  it('maps FL Studio layout: Z row is C3 octave, Q row is C4 octave', () => {
    expect(KEY_TO_MIDI.KeyZ).toBe(48);
    expect(KEY_TO_MIDI.KeyS).toBe(49);
    expect(KEY_TO_MIDI.KeyM).toBe(59);
    expect(KEY_TO_MIDI.Comma).toBe(60);
    expect(KEY_TO_MIDI.KeyQ).toBe(60);
    expect(KEY_TO_MIDI.Digit2).toBe(61);
    expect(KEY_TO_MIDI.KeyI).toBe(72);
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

  it('labels prefer Q row for middle C', () => {
    expect(labelForMidi(60)).toBe('Q');
    expect(labelForMidi(48)).toBe('Z');
    expect(labelForMidi(61)).toBe('2');
  });
});
