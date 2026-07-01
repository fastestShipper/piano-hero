# Piano Hero 3D

A Guitar Hero-style piano practice experience for the browser. Notes approach on a 3D concert-hall highway and you perform them on your physical keyboard with a real piano-style layout. Sampled grand piano audio (Salamander), judgment windows, combos, and a dark-luxury Three.js stage.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # vitest unit suite (judge, scoring, chart, mapping, clock, session)
pnpm build      # type-check + production build
```

## Controls

Piano layout with **middle C on B**. `KeyboardEvent.code` based, so it works on any physical layout.

```
Bottom row (main, one continuous run F3..A4, middle C at B):
    S  D  F     H  J     L  ;       -> F#3 G#3 A#3  C#4 D#4  F#4 G#4
   Z  X  C  V  B  N  M  ,  .  /     -> F3 G3 A3 B3 C4 D4 E4 F4 G4 A4

Top row (alternate C4 octave plus the highest notes):
      2     4  5     7  8  9        -> A#3   C#4 D#4   F#4 G#4 A#4
   Q  W  E  R  T  Y  U  I  O  P     -> A3 B3 C4 D4 E4 F4 G4 A4 B4 C5
```

- The home-row keys sit exactly where the black keys fall; G and K are unused because the piano has no black key there (B-C and E-F).
- A3-A4 exist on both rows so either hand can take them; A#4, B4 and C5 live only on the top row.
- Falling notes display the physical key letter on the gem itself.
- The piano always sounds, even on a missed judgment: expression first.
- `Esc` pauses a song or exits free play. `Espacio` taps during calibration.

## Game rules

- Judgment windows: Perfect +/-50 ms, Great +/-100 ms, Good +/-150 ms, otherwise Miss.
- Input is judged with `event.timeStamp` mapped to the audio clock: frame drops never affect timing.
- Holds (notes >= 0.5 s): keep the key down for >= 90% of the duration for a bonus.
- Combo multiplier x1 to x4, stepping every 10 notes. Wrong keys break the combo but do not count as misses.
- Rating: S >= 95%, A >= 90%, B >= 80%, else C.
- Calibration: tap along a metronome; the mean offset is stored in `localStorage` and applied to every session.

## Chart format

Charts are built in beats via `song(title, bpm, difficulty, rows)` where each row is `[beat, midi, beats, hand]` (`src/charts/`). The runtime format is validated JSON (`parseChart` in `src/game/chart.ts`):

```json
{
  "title": "Example", "bpm": 100, "difficulty": 1, "audioOffset": 0,
  "notes": [{ "t": 2.0, "midi": 60, "d": 0.5, "hand": "R" }]
}
```

`t` and `d` are seconds; `midi` must be 53-72 (F3-C5).

## Architecture

- The audio clock (`Tone.now()`) is the single source of truth for song time; `requestAnimationFrame` only interpolates visuals.
- Pure logic (`game/judge`, `game/scoring`, `game/chart`, `game/session`, `core/clock`, `core/mapping`) has no three/tone imports and is unit-tested.
- Render layer: instanced note pools (one draw call per color class), pooled particles, no allocations in the frame loop.

## Future work

- Web MIDI input (real MIDI keyboard).
- `.mid` import with auto-generated difficulties (`@tonejs/midi`).
- Practice mode: slow down, loop sections, wait-for-note.
- 88-key mode, chart editor, leaderboards, touch support.
