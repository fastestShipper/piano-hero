import type { Chart } from './chart';
import {
  Judge, DEFAULT_WINDOWS,
  type JudgeWindows, type HitEvent, type HoldRelease, type TrackedNote,
} from './judge';
import {
  createScoreState, applyJudgment, applyHoldBonus, breakCombo,
  type ScoreState,
} from './scoring';

export class GameSession {
  private judge: Judge;
  private state: ScoreState = createScoreState();
  private lastNoteEnd: number;

  constructor(
    chart: Chart,
    windows: JudgeWindows = DEFAULT_WINDOWS,
    private calibrationOffset = 0,
  ) {
    this.judge = new Judge(chart.notes, windows);
    this.lastNoteEnd = chart.notes.reduce((max, n) => Math.max(max, n.t + n.d), 0);
  }

  handleNoteOn(midi: number, audioTime: number): { hit: HitEvent | null; strayBrokeCombo: boolean } {
    const time = audioTime - this.calibrationOffset;
    const hit = this.judge.onKeyDown(midi, time);
    if (hit) {
      this.state = applyJudgment(this.state, hit.judgment);
      return { hit, strayBrokeCombo: false };
    }
    const hadCombo = this.state.combo > 0;
    this.state = breakCombo(this.state);
    return { hit: null, strayBrokeCombo: hadCombo };
  }

  handleNoteOff(midi: number, audioTime: number): HoldRelease | null {
    const rel = this.judge.onKeyUp(midi, audioTime - this.calibrationOffset);
    if (rel) this.state = applyHoldBonus(this.state, rel.full);
    return rel;
  }

  sweep(songTime: number): HitEvent[] {
    const misses = this.judge.advance(songTime - this.calibrationOffset);
    for (const _ of misses) this.state = applyJudgment(this.state, 'miss');
    return misses;
  }

  isFinished(songTime: number): boolean {
    return songTime > this.lastNoteEnd + 1.5 && this.judge.notes.every((n) => n.state !== 'pending');
  }

  get score(): ScoreState {
    return this.state;
  }

  get notes(): readonly TrackedNote[] {
    return this.judge.notes;
  }
}
