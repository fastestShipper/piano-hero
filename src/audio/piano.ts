import * as Tone from 'tone';
import { midiToName } from '../core/mapping';

const SAMPLE_BASE_URL = 'https://tonejs.github.io/audio/salamander/';
// Minor-third spacing covers C3..C5 with at most 1.5 semitones of repitching
const SAMPLE_NOTES = ['A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5'];

export class PianoSampler {
  private constructor(private sampler: Tone.Sampler) {}

  static async create(): Promise<PianoSampler> {
    await Tone.start();
    const urls: Record<string, string> = {};
    for (const note of SAMPLE_NOTES) urls[note.replace('s', '#')] = `${note}.mp3`;
    const sampler = await new Promise<Tone.Sampler>((resolve, reject) => {
      const s = new Tone.Sampler({
        urls,
        baseUrl: SAMPLE_BASE_URL,
        release: 1,
        onload: () => resolve(s),
        onerror: (e) => reject(e),
      }).toDestination();
    });
    return new PianoSampler(sampler);
  }

  noteOn(midi: number, velocity = 0.9): void {
    this.sampler.triggerAttack(midiToName(midi), Tone.now(), velocity);
  }

  noteOff(midi: number): void {
    this.sampler.triggerRelease(midiToName(midi), Tone.now());
  }
}
