# Piano Hero 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Guitar Hero-style 3D piano practice web app: notes approach on a 25-lane highway, the player performs them on the physical keyboard (FL Studio mapping, C3-C5), with sampled piano audio, judgment/scoring/combos, and a dark-luxury concert-hall look.

**Architecture:** Vite + TypeScript vanilla app. Audio clock (`Tone.now()`) is the single source of truth for time; rAF only interpolates visuals. Pure logic modules (`chart`, `judge`, `scoring`, `mapping`, `clock`) are dependency-free and unit-tested with Vitest. Three.js render layer (scene, keyboard3d, highway, effects) and DOM HUD consume the logic.

**Tech Stack:** three, tone, typescript, vite, vitest. Package manager: pnpm.

## Global Constraints

- UI copy in Spanish; ALL code, identifiers, comments, and docs in English.
- Never use em dashes in any text or UI copy.
- Immutable update patterns in game logic (scoring returns new state objects).
- `game/judge.ts`, `game/scoring.ts`, `game/chart.ts`, `core/mapping.ts`, `core/clock.ts` must NOT import three or tone.
- MIDI range 48 (C3) to 72 (C5). Judgment windows: perfect 0.05 s, great 0.10 s, good 0.15 s.
- Piano always sounds on key press regardless of judgment.
- Object pooling for notes/particles; no per-frame allocations in the render loop.
- Project root: `Y:\work\piano-hero`. Commits: conventional format, no attribution footer.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `.gitignore`

**Interfaces:**
- Produces: working `pnpm dev` and `pnpm test` commands for all later tasks.

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "piano-hero",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": { "three": "^0.166.0", "tone": "^15.0.4" },
  "devDependencies": {
    "@types/three": "^0.166.0",
    "typescript": "^5.5.0",
    "vite": "^5.3.0",
    "vitest": "^2.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
export default defineConfig({ base: './' });
```

`index.html`:
```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Piano Hero 3D</title>
  <link rel="stylesheet" href="/src/styles.css" />
</head>
<body>
  <canvas id="stage"></canvas>
  <div id="hud"></div>
  <div id="screens"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/main.ts` (stub): `console.log('piano-hero boot');`

`src/styles.css` (base): full-viewport canvas, `#hud`/`#screens` as fixed overlays, dark background `#05070d`, system font stack.

`.gitignore`: `node_modules/`, `dist/`.

- [ ] **Step 2: Install and verify**

Run: `pnpm install && pnpm vitest run --passWithNoTests && pnpm build`
Expected: install OK, tests pass (0 tests), build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite + ts + three + tone + vitest"
```

---

### Task 2: Keyboard mapping (core/mapping.ts)

**Files:**
- Create: `src/core/mapping.ts`
- Test: `tests/mapping.test.ts`

**Interfaces:**
- Produces: `KEY_TO_MIDI: Record<string, number>` (KeyboardEvent.code to MIDI), `MIDI_MIN = 48`, `MIDI_MAX = 72`, `isBlackKey(midi): boolean`, `midiToName(midi): string`, `labelForMidi(midi): string` (physical key letter, prefers Q-row for C4).

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run to verify fail** — `pnpm vitest run tests/mapping.test.ts` expects module-not-found FAIL.

- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run to verify pass** — `pnpm vitest run tests/mapping.test.ts` expects PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: fl studio keyboard-to-midi mapping"`

---

### Task 3: Chart format and builder (game/chart.ts, charts/builder.ts)

**Files:**
- Create: `src/game/chart.ts`, `src/charts/builder.ts`
- Test: `tests/chart.test.ts`

**Interfaces:**
- Produces: `Hand = 'R'|'L'`, `ChartNote {t, midi, d, hand}`, `Chart {title, bpm, difficulty, audioOffset, notes}`, `ChartError`, `parseChart(data: unknown): Chart` (validates, sorts by t), `song(title, bpm, difficulty, rows: Row[]): Chart` where `Row = [beat, midi, beats, Hand]` and `t = LEAD_IN_SECONDS + beat * 60 / bpm` with `LEAD_IN_SECONDS = 2`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { parseChart, ChartError } from '../src/game/chart';
import { song, LEAD_IN_SECONDS } from '../src/charts/builder';

describe('parseChart', () => {
  const valid = {
    title: 'Test', bpm: 100, difficulty: 1, audioOffset: 0,
    notes: [ { t: 1, midi: 60, d: 0.5, hand: 'R' }, { t: 0, midi: 48, d: 0.25, hand: 'L' } ],
  };
  it('accepts a valid chart and sorts notes by time', () => {
    const c = parseChart(valid);
    expect(c.notes[0].t).toBe(0);
    expect(c.notes[1].midi).toBe(60);
  });
  it('rejects out-of-range midi', () => {
    const bad = { ...valid, notes: [{ t: 0, midi: 90, d: 1, hand: 'R' }] };
    expect(() => parseChart(bad)).toThrow(ChartError);
  });
  it('rejects non-positive duration and negative time', () => {
    expect(() => parseChart({ ...valid, notes: [{ t: -1, midi: 60, d: 1, hand: 'R' }] })).toThrow(ChartError);
    expect(() => parseChart({ ...valid, notes: [{ t: 0, midi: 60, d: 0, hand: 'R' }] })).toThrow(ChartError);
  });
  it('rejects missing fields', () => {
    expect(() => parseChart({ title: 'x' })).toThrow(ChartError);
  });
});

describe('song builder', () => {
  it('converts beats to seconds with lead-in', () => {
    const c = song('S', 120, 1, [[0, 60, 1, 'R'], [2, 62, 0.5, 'R']]);
    expect(c.notes[0].t).toBe(LEAD_IN_SECONDS);
    expect(c.notes[1].t).toBeCloseTo(LEAD_IN_SECONDS + 1.0);
    expect(c.notes[1].d).toBeCloseTo(0.25);
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

`src/game/chart.ts`:
```ts
import { MIDI_MIN, MIDI_MAX } from '../core/mapping';

export type Hand = 'R' | 'L';
export interface ChartNote { t: number; midi: number; d: number; hand: Hand; }
export interface Chart {
  title: string; bpm: number; difficulty: number; audioOffset: number;
  notes: readonly ChartNote[];
}
export class ChartError extends Error {}

function fail(msg: string): never { throw new ChartError(msg); }

export function parseChart(data: unknown): Chart {
  if (typeof data !== 'object' || data === null) fail('chart must be an object');
  const c = data as Record<string, unknown>;
  if (typeof c.title !== 'string' || typeof c.bpm !== 'number' ||
      typeof c.difficulty !== 'number' || typeof c.audioOffset !== 'number' ||
      !Array.isArray(c.notes)) fail('chart missing required fields');
  const notes = c.notes.map((n, i) => {
    const note = n as Record<string, unknown>;
    const { t, midi, d, hand } = note;
    if (typeof t !== 'number' || t < 0) fail(`note ${i}: invalid time`);
    if (typeof midi !== 'number' || midi < MIDI_MIN || midi > MIDI_MAX) fail(`note ${i}: midi out of range`);
    if (typeof d !== 'number' || d <= 0) fail(`note ${i}: invalid duration`);
    if (hand !== 'R' && hand !== 'L') fail(`note ${i}: invalid hand`);
    return { t, midi, d, hand } as ChartNote;
  });
  notes.sort((a, b) => a.t - b.t);
  return { title: c.title, bpm: c.bpm, difficulty: c.difficulty, audioOffset: c.audioOffset, notes };
}
```

`src/charts/builder.ts`:
```ts
import type { Chart, Hand } from '../game/chart';
import { parseChart } from '../game/chart';

export const LEAD_IN_SECONDS = 2;
export type Row = [beat: number, midi: number, beats: number, hand: Hand];

export function song(title: string, bpm: number, difficulty: number, rows: Row[]): Chart {
  const spb = 60 / bpm;
  return parseChart({
    title, bpm, difficulty, audioOffset: 0,
    notes: rows.map(([beat, midi, beats, hand]) => ({
      t: LEAD_IN_SECONDS + beat * spb, midi, d: beats * spb, hand,
    })),
  });
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "feat: chart format, validation and beat-based builder"`

---

### Task 4: Scoring (game/scoring.ts)

**Files:**
- Create: `src/game/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Produces: `Judgment = 'perfect'|'great'|'good'|'miss'`, `ScoreState {score, combo, maxCombo, counts}`, `createScoreState()`, `multiplierFor(combo)` (x1 to x4 stepping every 10), `applyJudgment(state, j): ScoreState` (immutable), `applyHoldBonus(state, full: boolean): ScoreState`, `breakCombo(state): ScoreState`, `accuracy(state): number` (0..1), `rating(acc): 'S'|'A'|'B'|'C'`. Base points: perfect 100, great 60, good 30, miss 0. Hold bonus: 50 x multiplier when full.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { createScoreState, applyJudgment, applyHoldBonus, breakCombo, multiplierFor, accuracy, rating } from '../src/game/scoring';

describe('scoring', () => {
  it('multiplier steps every 10 combo, caps at 4', () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(9)).toBe(1);
    expect(multiplierFor(10)).toBe(2);
    expect(multiplierFor(30)).toBe(4);
    expect(multiplierFor(99)).toBe(4);
  });
  it('applyJudgment adds points scaled by multiplier and is immutable', () => {
    const s0 = createScoreState();
    const s1 = applyJudgment(s0, 'perfect');
    expect(s0.score).toBe(0);
    expect(s1.score).toBe(100);
    expect(s1.combo).toBe(1);
    expect(s1.counts.perfect).toBe(1);
  });
  it('uses the multiplier of the combo after increment', () => {
    let s = createScoreState();
    for (let i = 0; i < 9; i++) s = applyJudgment(s, 'perfect');
    const before = s.score;
    s = applyJudgment(s, 'perfect'); // combo becomes 10 -> x2
    expect(s.score - before).toBe(200);
  });
  it('miss resets combo, keeps maxCombo', () => {
    let s = createScoreState();
    s = applyJudgment(s, 'perfect');
    s = applyJudgment(s, 'great');
    s = applyJudgment(s, 'miss');
    expect(s.combo).toBe(0);
    expect(s.maxCombo).toBe(2);
    expect(s.counts.miss).toBe(1);
  });
  it('breakCombo resets combo without adding a miss count', () => {
    let s = applyJudgment(createScoreState(), 'perfect');
    s = breakCombo(s);
    expect(s.combo).toBe(0);
    expect(s.counts.miss).toBe(0);
  });
  it('hold bonus adds 50 x multiplier only when full', () => {
    let s = applyJudgment(createScoreState(), 'perfect');
    const with_ = applyHoldBonus(s, true);
    expect(with_.score).toBe(150);
    expect(applyHoldBonus(s, false).score).toBe(100);
  });
  it('accuracy weights perfect 1, great 0.6, good 0.3, miss 0', () => {
    let s = createScoreState();
    s = applyJudgment(s, 'perfect');
    s = applyJudgment(s, 'miss');
    expect(accuracy(s)).toBeCloseTo(0.5);
    expect(accuracy(createScoreState())).toBe(1);
  });
  it('rates S>=0.95 A>=0.90 B>=0.80 else C', () => {
    expect(rating(0.97)).toBe('S');
    expect(rating(0.92)).toBe('A');
    expect(rating(0.85)).toBe('B');
    expect(rating(0.5)).toBe('C');
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

```ts
export type Judgment = 'perfect' | 'great' | 'good' | 'miss';

export interface ScoreState {
  readonly score: number;
  readonly combo: number;
  readonly maxCombo: number;
  readonly counts: Readonly<Record<Judgment, number>>;
}

const BASE_POINTS: Record<Judgment, number> = { perfect: 100, great: 60, good: 30, miss: 0 };
const ACCURACY_WEIGHT: Record<Judgment, number> = { perfect: 1, great: 0.6, good: 0.3, miss: 0 };
const HOLD_BONUS = 50;

export function createScoreState(): ScoreState {
  return { score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 } };
}

export function multiplierFor(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 10));
}

export function applyJudgment(state: ScoreState, j: Judgment): ScoreState {
  const combo = j === 'miss' ? 0 : state.combo + 1;
  return {
    score: state.score + BASE_POINTS[j] * multiplierFor(combo),
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    counts: { ...state.counts, [j]: state.counts[j] + 1 },
  };
}

export function applyHoldBonus(state: ScoreState, full: boolean): ScoreState {
  if (!full) return state;
  return { ...state, score: state.score + HOLD_BONUS * multiplierFor(state.combo) };
}

export function breakCombo(state: ScoreState): ScoreState {
  return { ...state, combo: 0 };
}

export function accuracy(state: ScoreState): number {
  const total = state.counts.perfect + state.counts.great + state.counts.good + state.counts.miss;
  if (total === 0) return 1;
  const weighted = (Object.keys(ACCURACY_WEIGHT) as Judgment[])
    .reduce((sum, j) => sum + ACCURACY_WEIGHT[j] * state.counts[j], 0);
  return weighted / total;
}

export function rating(acc: number): 'S' | 'A' | 'B' | 'C' {
  if (acc >= 0.95) return 'S';
  if (acc >= 0.9) return 'A';
  if (acc >= 0.8) return 'B';
  return 'C';
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "feat: immutable scoring with combo multiplier and rating"`

---

### Task 5: Judge (game/judge.ts)

**Files:**
- Create: `src/game/judge.ts`
- Test: `tests/judge.test.ts`

**Interfaces:**
- Consumes: `ChartNote` from Task 3, `Judgment` from Task 4.
- Produces: `JudgeWindows {perfect, great, good}`, `DEFAULT_WINDOWS`, `HOLD_MIN_DURATION = 0.5`, `classify(delta, windows): Judgment | null`, `TrackedNote extends ChartNote {id, state: 'pending'|'hit'|'missed', judgment?, holding?}`, `HitEvent {noteId, judgment}`, `HoldRelease {noteId, ratio, full}`, class `Judge` with `constructor(notes, windows?)`, `onKeyDown(midi, time): HitEvent | null`, `onKeyUp(midi, time): HoldRelease | null`, `advance(time): HitEvent[]` (returns miss events), `get notes(): readonly TrackedNote[]`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { Judge, classify, DEFAULT_WINDOWS } from '../src/game/judge';
import type { ChartNote } from '../src/game/chart';

const n = (t: number, midi: number, d = 0.25): ChartNote => ({ t, midi, d, hand: 'R' });

describe('classify', () => {
  it('maps absolute delta to judgment tiers', () => {
    expect(classify(0.03, DEFAULT_WINDOWS)).toBe('perfect');
    expect(classify(-0.05, DEFAULT_WINDOWS)).toBe('perfect');
    expect(classify(0.08, DEFAULT_WINDOWS)).toBe('great');
    expect(classify(-0.13, DEFAULT_WINDOWS)).toBe('good');
    expect(classify(0.2, DEFAULT_WINDOWS)).toBeNull();
  });
});

describe('Judge', () => {
  it('hits the nearest pending note of that midi within window', () => {
    const j = new Judge([n(1, 60), n(1.4, 60)]);
    const hit = j.onKeyDown(60, 1.42);
    expect(hit).toEqual({ noteId: 1, judgment: 'perfect' });
    expect(j.notes[1].state).toBe('hit');
    expect(j.notes[0].state).toBe('pending');
  });
  it('returns null for stray keys (no note in window)', () => {
    const j = new Judge([n(1, 60)]);
    expect(j.onKeyDown(62, 1.0)).toBeNull();
    expect(j.onKeyDown(60, 2.0)).toBeNull();
  });
  it('never hits the same note twice', () => {
    const j = new Judge([n(1, 60)]);
    expect(j.onKeyDown(60, 1.0)).not.toBeNull();
    expect(j.onKeyDown(60, 1.01)).toBeNull();
  });
  it('advance marks overdue pending notes as missed', () => {
    const j = new Judge([n(1, 60), n(3, 62)]);
    const misses = j.advance(1.2);
    expect(misses).toEqual([{ noteId: 0, judgment: 'miss' }]);
    expect(j.notes[0].state).toBe('missed');
    expect(j.advance(1.3)).toEqual([]);
  });
  it('grades hold release ratio against note duration', () => {
    const j = new Judge([n(1, 60, 1.0)]);
    j.onKeyDown(60, 1.0);
    const rel = j.onKeyUp(60, 1.95);
    expect(rel).not.toBeNull();
    expect(rel!.ratio).toBeCloseTo(0.95);
    expect(rel!.full).toBe(true);
  });
  it('short holds are not full', () => {
    const j = new Judge([n(1, 60, 1.0)]);
    j.onKeyDown(60, 1.0);
    expect(j.onKeyUp(60, 1.4)!.full).toBe(false);
  });
  it('keyup without an active hold returns null (short notes)', () => {
    const j = new Judge([n(1, 60, 0.25)]);
    j.onKeyDown(60, 1.0);
    expect(j.onKeyUp(60, 1.2)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

```ts
import type { ChartNote } from './chart';
import type { Judgment } from './scoring';

export interface JudgeWindows { perfect: number; great: number; good: number; }
export const DEFAULT_WINDOWS: JudgeWindows = { perfect: 0.05, great: 0.1, good: 0.15 };
export const HOLD_MIN_DURATION = 0.5;

export interface TrackedNote extends ChartNote {
  id: number;
  state: 'pending' | 'hit' | 'missed';
  judgment?: Judgment;
  holding?: boolean;
}
export interface HitEvent { noteId: number; judgment: Judgment; }
export interface HoldRelease { noteId: number; ratio: number; full: boolean; }

export function classify(delta: number, w: JudgeWindows): Judgment | null {
  const abs = Math.abs(delta);
  if (abs <= w.perfect) return 'perfect';
  if (abs <= w.great) return 'great';
  if (abs <= w.good) return 'good';
  return null;
}

export class Judge {
  private tracked: TrackedNote[];
  private activeHolds = new Map<number, number>(); // midi -> noteId

  constructor(notes: readonly ChartNote[], private windows: JudgeWindows = DEFAULT_WINDOWS) {
    this.tracked = notes.map((note, id) => ({ ...note, id, state: 'pending' }));
  }

  get notes(): readonly TrackedNote[] { return this.tracked; }

  onKeyDown(midi: number, time: number): HitEvent | null {
    let best: TrackedNote | null = null;
    for (const note of this.tracked) {
      if (note.state !== 'pending' || note.midi !== midi) continue;
      if (Math.abs(note.t - time) > this.windows.good) continue;
      if (!best || Math.abs(note.t - time) < Math.abs(best.t - time)) best = note;
    }
    if (!best) return null;
    const judgment = classify(best.t - time, this.windows)!;
    best.state = 'hit';
    best.judgment = judgment;
    if (best.d >= HOLD_MIN_DURATION) {
      best.holding = true;
      this.activeHolds.set(midi, best.id);
    }
    return { noteId: best.id, judgment };
  }

  onKeyUp(midi: number, time: number): HoldRelease | null {
    const noteId = this.activeHolds.get(midi);
    if (noteId === undefined) return null;
    this.activeHolds.delete(midi);
    const note = this.tracked[noteId];
    note.holding = false;
    const ratio = Math.min(1, Math.max(0, (time - note.t) / note.d));
    return { noteId, ratio, full: ratio >= 0.9 };
  }

  advance(time: number): HitEvent[] {
    const misses: HitEvent[] = [];
    for (const note of this.tracked) {
      if (note.state !== 'pending') continue;
      if (time - note.t > this.windows.good) {
        note.state = 'missed';
        note.judgment = 'miss';
        misses.push({ noteId: note.id, judgment: 'miss' });
      }
    }
    return misses;
  }
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "feat: timing judge with holds and miss sweep"`

---

### Task 6: Song clock (core/clock.ts)

**Files:**
- Create: `src/core/clock.ts`
- Test: `tests/clock.test.ts`

**Interfaces:**
- Produces: class `SongClock` with `constructor(now: () => number)` (inject `() => Tone.now()` in app, fake in tests), `start()`, `pause()`, `resume()`, `stop()`, `get time(): number`, `get running(): boolean`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { SongClock } from '../src/core/clock';

describe('SongClock', () => {
  it('tracks elapsed time from start using the injected clock', () => {
    let t = 100;
    const c = new SongClock(() => t);
    c.start();
    t = 103.5;
    expect(c.time).toBeCloseTo(3.5);
    expect(c.running).toBe(true);
  });
  it('freezes during pause and resumes without jump', () => {
    let t = 0;
    const c = new SongClock(() => t);
    c.start();
    t = 2; c.pause();
    t = 10;
    expect(c.time).toBeCloseTo(2);
    expect(c.running).toBe(false);
    c.resume();
    t = 11;
    expect(c.time).toBeCloseTo(3);
  });
  it('stop resets to zero and not running', () => {
    let t = 0;
    const c = new SongClock(() => t);
    c.start(); t = 5; c.stop();
    expect(c.time).toBe(0);
    expect(c.running).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

```ts
export class SongClock {
  private startAt = 0;
  private pausedAt: number | null = null;
  private started = false;

  constructor(private now: () => number) {}

  start(): void { this.startAt = this.now(); this.pausedAt = null; this.started = true; }
  stop(): void { this.started = false; this.pausedAt = null; }

  pause(): void {
    if (!this.running) return;
    this.pausedAt = this.time;
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.startAt = this.now() - this.pausedAt;
    this.pausedAt = null;
  }

  get time(): number {
    if (!this.started) return 0;
    return this.pausedAt ?? this.now() - this.startAt;
  }

  get running(): boolean { return this.started && this.pausedAt === null; }
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "feat: audio-clock driven song clock with pause"`

---

### Task 7: Audio sampler + keyboard input (Phase 1 milestone: playable piano)

**Files:**
- Create: `src/audio/piano.ts`, `src/core/input.ts`
- Modify: `src/main.ts` (wire free play)

**Interfaces:**
- Produces: `PianoSampler.create(onProgress?): Promise<PianoSampler>` with `noteOn(midi, velocity?)` and `noteOff(midi)`; `KeyboardInput` class: `constructor(handler: (e: {midi, type: 'on'|'off', timeStamp: number}) => void)`, `attach()`, `detach()`, dedupes key repeat, ignores modifier-held combos; `eventTimeToAudioTime(timeStampMs): number` helper exported from `input.ts` (maps `event.timeStamp` to Tone clock: `Tone.now() - (performance.now() - timeStampMs) / 1000`).

- [ ] **Step 1: Implement `src/audio/piano.ts`**

```ts
import * as Tone from 'tone';
import { midiToName } from '../core/mapping';

const SAMPLE_BASE_URL = 'https://tonejs.github.io/audio/salamander/';
const SAMPLE_NOTES = ['A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5'];

export class PianoSampler {
  private constructor(private sampler: Tone.Sampler) {}

  static async create(): Promise<PianoSampler> {
    await Tone.start();
    const urls: Record<string, string> = {};
    for (const note of SAMPLE_NOTES) urls[note.replace('s', '#')] = `${note}.mp3`;
    const sampler = await new Promise<Tone.Sampler>((resolve, reject) => {
      const s = new Tone.Sampler({
        urls, baseUrl: SAMPLE_BASE_URL, release: 1,
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
```

- [ ] **Step 2: Implement `src/core/input.ts`**

```ts
import * as Tone from 'tone';
import { KEY_TO_MIDI } from './mapping';

export interface NoteInputEvent { midi: number; type: 'on' | 'off'; timeStamp: number; }

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
```

Note: two physical codes can map to the same midi (Comma and KeyQ are both 60). `downCodes` tracks codes, not midis, so releasing one does not silence the other; `PianoSampler.triggerRelease` per name is idempotent enough for the MVP.

- [ ] **Step 3: Wire free play in `src/main.ts`** (temporary: click-to-start overlay, then sampler + input; log notes to console).

- [ ] **Step 4: Manual verification** — Run `pnpm dev`, click to start, play `Z X C V B N M ,` and chords across both octaves. Expected: real piano sound, polyphony, sustain on hold, release on keyup.

- [ ] **Step 5: Commit** — `git commit -am "feat: salamander sampler + physical keyboard input (playable piano)"`

---

### Task 8: 3D stage and piano (render/scene.ts, render/keyboard3d.ts)

**Files:**
- Create: `src/render/scene.ts`, `src/render/keyboard3d.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `createStage(canvas): Stage` where `Stage = {scene, camera, renderer, composer, render(dt), resize(), setComboTier(tier: 0|1|2|3)}`; `createKeyboard(scene): Keyboard3D` where `Keyboard3D = {group, laneX(midi): number, laneWidth(midi): number, press(midi), release(midi), update(dt)}`. Key line (strike line) is at world z = 0; keys extend toward +z (camera side). White key pitch 1.05 world units, white width 0.95, black width 0.6.

- [ ] **Step 1: Implement `scene.ts`**

Dark-luxury stage: renderer (antialias, ACES tone mapping, sRGB), background and fog `#05070d` (fog 25 to 70), PMREM RoomEnvironment as `scene.environment`, ambient `#1a2030` 0.6, warm directional `#ffe0b0` 0.85 from (6, 14, 8), cool cyan point light behind the highway, reflective dark floor (200x200 plane, metalness 0.85, roughness 0.4), 4 additive light cones above the stage (opacity 0 at tier 0 up to 0.10 at tier 3), EffectComposer with RenderPass + UnrealBloomPass (strength 0.9, radius 0.5, threshold 0.55). `setComboTier` lerps cone opacity and bloom strength (0.9 to 1.25). `resize` updates camera aspect, renderer and composer size. Camera: fov 55 at (0, 9, 11) looking at (0, 1, -10).

- [ ] **Step 2: Implement `keyboard3d.ts`**

25 keys C3..C5 built from `isBlackKey`/`labelForMidi`:
- White key: `BoxGeometry(0.95, 0.5, 5.2)`, center z 2.6, y 0.25, material ivory `#f2ead8`, roughness 0.35. x = (whiteIndex - 7) * 1.05.
- Black key: `BoxGeometry(0.6, 0.55, 3.2)`, center z 1.6, y 0.62, glossy `#11131a`, metalness 0.5, roughness 0.22. x = midpoint of neighbor whites.
- Piano body: black lacquer box behind the keys (metalness 0.8, roughness 0.15) plus a thin red felt strip.
- Key label: per-key `CanvasTexture` sprite with the physical letter, placed on the key front, ivory text on transparent.
- `press(midi)`: sets target dip y (-0.12) and emissive flash (amber for white, cyan-tinted for black); `release(midi)` restores; `update(dt)` lerps positions and decays emissive intensity toward rest.
- `laneX(midi)` returns key center x; `laneWidth(midi)` returns 0.8 white / 0.55 black. Store per-midi in a Map at build time.

- [ ] **Step 3: Wire into `main.ts`**: create stage + keyboard, rAF loop `keyboard.update(dt); stage.render(dt)`, call `keyboard.press/release` from input handler alongside the sampler.

- [ ] **Step 4: Manual verification** — `pnpm dev`: dark concert stage, 25-key reflective piano with letter labels, keys dip and glow when played, 60 fps in devtools performance panel.

- [ ] **Step 5: Commit** — `git commit -am "feat: dark-luxury 3d stage and playable 25-key piano"`

---

### Task 9: Note highway (render/highway.ts)

**Files:**
- Create: `src/render/highway.ts`
- Modify: `src/main.ts` (dev harness: press F1 to run a hardcoded test chart against the clock)

**Interfaces:**
- Consumes: `TrackedNote` from Task 5, `laneX/laneWidth` from Task 8.
- Produces: `createHighway(scene, laneX, laneWidth): Highway` where `Highway = {group, SPEED: 18, update(songTime: number, notes: readonly TrackedNote[]): void}`. Notes render only within `songTime - 0.3` to `songTime + 3.5` lookahead. A note at chart time `t` sits at `z = -(t - songTime) * SPEED` (z = 0 exactly at the strike line). Hold notes stretch: tail length `d * SPEED`.

- [ ] **Step 1: Implement**

- Highway bed: long dark plane (27 x 70) with subtle emissive lane separator lines (LineSegments at each white-key boundary), plus a glowing strike bar at z = 0 (thin emissive box, warm white).
- Notes: one `InstancedMesh` (BoxGeometry 1x0.32x1, capacity 300) with `instanceColor`. Per frame, iterate visible notes: compose matrix (x = laneX(midi), y = 0.85 for white lanes / 1.0 for black, scaleX = laneWidth(midi), scaleZ = max(0.8, d x SPEED), z centered so the head edge lands at `-(t - songTime) * SPEED`). Color: amber `#ffb347` right hand, cyan `#4dd7ff` left hand; hit notes fade down scale, missed notes tint dark grey `#3a3f4a`. Unused instances get zero scale. `instanceMatrix.needsUpdate` once per frame. No allocations inside the loop (reuse Matrix4/Color/Vector3 temps).

- [ ] **Step 2: Dev harness in main.ts**: F1 starts a `SongClock(() => Tone.now())` with a scale-and-chords test chart through `Judge` (judge wired read-only for now: only `advance` for state coloring).

- [ ] **Step 3: Manual verification** — Notes flow smoothly toward the keys and the head crosses the strike bar exactly when the metronome-true chart time arrives (visually check with sound by playing along). No stutter, stable fps.

- [ ] **Step 4: Commit** — `git commit -am "feat: 25-lane note highway with instanced falling notes"`

---

### Task 10: Gameplay integration, HUD and effects

**Files:**
- Create: `src/ui/hud.ts`, `src/render/effects.ts`, `src/game/session.ts`
- Modify: `src/main.ts`, `src/styles.css`

**Interfaces:**
- Produces:
  - `createEffects(scene): Effects = {burst(x, hand), shockwave(x), update(dt)}`. Particle pool: 512-particle `THREE.Points`, additive blending; burst = 24 particles, gold for perfect/great, soft blue for good. Shockwave: pooled expanding rings at the strike line.
  - `createHud(): Hud = {update(score, combo, multiplier, acc), flashJudgment(j: Judgment), setVisible(v)}`. DOM: score top-left, accuracy top-right, combo counter bottom-center (scales up on milestones), judgment word above the strike line (Spanish: PERFECTO, GENIAL, BIEN, FALLO) with CSS pop animation.
  - `GameSession` class in `game/session.ts` tying clock + judge + score together (no three/tone imports): `constructor(chart, windows?, calibrationOffset = 0)`, `handleNoteOn(midi, audioTime): {hit: HitEvent | null, strayBrokeCombo: boolean}`, `handleNoteOff(midi, audioTime): HoldRelease | null`, `sweep(songTime): HitEvent[]`, `get score(): ScoreState`, `get notes(): readonly TrackedNote[]`, `get finished(): boolean` (all notes resolved and songTime past last note end + 1.5 s, checked via `isFinished(songTime)`).
- Test: `tests/session.test.ts`.

- [ ] **Step 1: Write failing session tests**

```ts
import { describe, it, expect } from 'vitest';
import { GameSession } from '../src/game/session';
import type { Chart } from '../src/game/chart';

const chart: Chart = {
  title: 'T', bpm: 100, difficulty: 1, audioOffset: 0,
  notes: [
    { t: 1, midi: 60, d: 0.25, hand: 'R' },
    { t: 2, midi: 64, d: 1.0, hand: 'R' },
  ],
};

describe('GameSession', () => {
  it('scores a perfect hit', () => {
    const s = new GameSession(chart);
    const r = s.handleNoteOn(60, 1.01);
    expect(r.hit!.judgment).toBe('perfect');
    expect(s.score.score).toBe(100);
    expect(s.score.combo).toBe(1);
  });
  it('stray key breaks combo without a miss count', () => {
    const s = new GameSession(chart);
    s.handleNoteOn(60, 1.0);
    const r = s.handleNoteOn(50, 1.1);
    expect(r.hit).toBeNull();
    expect(r.strayBrokeCombo).toBe(true);
    expect(s.score.combo).toBe(0);
    expect(s.score.counts.miss).toBe(0);
  });
  it('applies calibration offset to hit times', () => {
    const s = new GameSession(chart, undefined, 0.1); // player hits 100 ms late consistently
    expect(s.handleNoteOn(60, 1.1).hit!.judgment).toBe('perfect');
  });
  it('full hold adds bonus on release', () => {
    const s = new GameSession(chart);
    s.handleNoteOn(64, 2.0);
    const before = s.score.score;
    s.handleNoteOff(64, 2.95);
    expect(s.score.score).toBe(before + 50);
  });
  it('sweep produces misses and finishes after the last note', () => {
    const s = new GameSession(chart);
    const misses = s.sweep(10);
    expect(misses.length).toBe(2);
    expect(s.score.counts.miss).toBe(2);
    expect(s.isFinished(10)).toBe(true);
    expect(s.isFinished(2.5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail, implement `game/session.ts`**

```ts
import type { Chart } from './chart';
import { Judge, DEFAULT_WINDOWS, type JudgeWindows, type HitEvent, type HoldRelease, type TrackedNote } from './judge';
import { createScoreState, applyJudgment, applyHoldBonus, breakCombo, type ScoreState } from './scoring';

export class GameSession {
  private judge: Judge;
  private state: ScoreState = createScoreState();
  private lastNoteEnd: number;

  constructor(chart: Chart, windows: JudgeWindows = DEFAULT_WINDOWS, private calibrationOffset = 0) {
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

  get score(): ScoreState { return this.state; }
  get notes(): readonly TrackedNote[] { return this.judge.notes; }
}
```

- [ ] **Step 3: Run to verify pass, commit** — `git commit -am "feat: game session orchestrating judge + scoring + calibration"`

- [ ] **Step 4: Implement `effects.ts` and `hud.ts` per interfaces above; wire full loop in `main.ts`**: input handlers route through the session while playing (sampler always sounds first), hits trigger `keyboard.press` + `effects.burst(laneX(midi), hand)` + `hud.flashJudgment`, perfect adds `effects.shockwave`, sweep runs each frame before `highway.update(t, session.notes)`, `stage.setComboTier(multiplierFor(combo) - 1)`, HUD updates each frame.

- [ ] **Step 5: Manual verification** — Play the F1 test chart end to end: judgments feel fair, particles and stage lighting react, combo drives the lights, HUD readable, misses sweep correctly.

- [ ] **Step 6: Commit** — `git commit -am "feat: hud, particle effects and full gameplay loop"`

---

### Task 11: Songs, menu, results and state machine

**Files:**
- Create: `src/charts/index.ts`, `src/ui/screens.ts`
- Modify: `src/main.ts`, `src/styles.css`

**Interfaces:**
- Produces: `SONGS: Chart[]` (3 built-in charts via `song(...)`); `createScreens(): Screens = {showMenu(songs, onPlay, onFreePlay, onCalibrate), showLoading(msg), showResults(stats, onReplay, onMenu), showCountdown(seconds), hideAll()}`. App states: `menu | loading | countdown | playing | results | freeplay` managed in `main.ts` with a single `setState` function. Escape pauses/resumes during `playing` (clock.pause + overlay).

- [ ] **Step 1: Write the three charts in `src/charts/index.ts`**

Using `song(title, bpm, difficulty, rows)`:
1. `Himno de la Alegria` (Ode to Joy), bpm 100, difficulty 1, right hand only, quarter notes E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4. D4 D4(2) then repeat ending D4. C4 C4(2). Midi: C4=60 D4=62 E4=64 F4=65 G4=67.
2. `Para Elisa` (Fur Elise opening, transposed down one octave to fit C3-C5), bpm 72 with eighth-note rows (0.5 beats), melody right hand E4 D#4 E4 D#4 E4 B3 D4 C4 A3(hold), left-hand arpeggios C3 E3 A3 / E3 G#3 B3 under the phrase, two passes.
3. `Canon en Do` (Canon in D transposed to C, simplified), bpm 70, difficulty 2, left hand whole-note bass C3 G3 A3 E3 F3 C3 F3 G3 (repeated), right hand half-note descending line E4 D4 C4 B3 A3 G3 A3 B3 then C4 B3 A3 G3 F3 E3 F3 G3.

- [ ] **Step 2: Implement `screens.ts`** — DOM screens with Spanish copy: menu (title `PIANO HERO`, song cards with title/difficulty stars, buttons `Tocar`, `Modo libre`, `Calibrar`), loading (`Cargando piano...`), countdown (3-2-1 with the lead-in), results (`Resultados`: score, max combo, accuracy %, S/A/B/C rating letter with glow, per-judgment counts, buttons `Repetir` and `Menu`), pause overlay (`Pausa. Esc para continuar`). Glassy dark cards, amber accents, consistent with the stage.

- [ ] **Step 3: State machine in `main.ts`** — menu → loading (sampler once) → countdown (uses chart lead-in) → playing (session active) → results (on `isFinished`) → menu/replay. Free play = playing without session or HUD. Keyboard always sounds in every state after audio init.

- [ ] **Step 4: Manual verification** — Full loop: menu, pick each of the 3 songs, play to results, replay, back to menu, free play works, Escape pause works, refresh persists nothing unexpected.

- [ ] **Step 5: Commit** — `git commit -am "feat: songs, menu, countdown, pause and results screens"`

---

### Task 12: Calibration, resilience and README

**Files:**
- Create: `src/ui/calibration.ts`, `README.md`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `runCalibration(onDone: (offsetSeconds: number) => void)`: overlay that plays a metronome tick (Tone.Synth short blip) every 0.6 s; after 4 count-in beats the player presses Space on each of 8 beats; offset = mean(tapAudioTime - beatAudioTime), clamped to [-0.3, 0.3], saved to `localStorage['ph.calibration']`; `loadCalibration(): number`. `GameSession` receives the stored offset on every song start.

- [ ] **Step 1: Implement calibration overlay and storage; wire `Calibrar` menu button and pass the offset into new sessions.**

- [ ] **Step 2: Resilience:**
- Sampler load failure: catch in loading state, show Spanish retry screen (`No se pudo cargar el audio. Reintentar`).
- WebGL context loss: listen for `webglcontextlost` on the canvas, pause the session, show overlay; `webglcontextrestored` resumes.
- Chart validation already throws `ChartError`; wrap song start in try/catch that returns to menu with a message.

- [ ] **Step 3: README.md** — project intro, controls diagram (the two-row mapping), `pnpm install / dev / test / build`, chart format docs, future work list from the spec.

- [ ] **Step 4: Final QA** — `pnpm test` (all green), `pnpm build` (clean), play all songs, verify 60 fps with the densest chart, calibration persists across refresh.

- [ ] **Step 5: Commit** — `git commit -am "feat: calibration, failure handling and docs"`

---

## Self-review notes

- Spec coverage: mapping (T2), chart format (T3), scoring (T4), judge windows/holds/chords (T5: chords emerge from per-note judgment), audio clock (T6), always-sounding sampler + input timestamps (T7), dark-luxury scene + 25-key piano + press feedback (T8), highway + instanced notes + hold tails (T9), HUD + particles + combo lighting + session (T10), 3 songs + menu + results + pause (T11), calibration + error handling + README (T12). Future work intentionally excluded.
- Types checked across tasks: `TrackedNote`, `HitEvent`, `HoldRelease`, `ScoreState`, `Chart`, `Judgment` names consistent.
- No placeholders: render tasks specify exact geometry, materials, colors, and behavior inline.
