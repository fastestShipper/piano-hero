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

Two-row piano layout centered on middle C. `KeyboardEvent.code` based, so it works on any physical layout.

```
Top row (right hand, middle C at E):
      2     4  5     7  8  9        -> A#3   C#4 D#4   F#4 G#4 A#4
   Q  W  E  R  T  Y  U  I  O  P     -> A3 B3 C4 D4 E4 F4 G4 A4 B4 C5

Bottom row (left hand):
    S  D     G  H  J     L  ;       -> C#3 D#3  F#3 G#3 A#3  C#4 D#4
   Z  X  C  V  B  N  M  ,  .  /     -> C3 D3 E3 F3 G3 A3 B3 C4 D4 E4
```

- A3-B3 exist on both rows so either hand can take them.
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

`t` and `d` are seconds; `midi` must be 48-72 (C3-C5).

## Architecture

- The audio clock (`Tone.now()`) is the single source of truth for song time; `requestAnimationFrame` only interpolates visuals.
- Pure logic (`game/judge`, `game/scoring`, `game/chart`, `game/session`, `core/clock`, `core/mapping`) has no three/tone imports and is unit-tested.
- Render layer: instanced note pools (one draw call per color class), pooled particles, no allocations in the frame loop.

## Future work

- Web MIDI input (real MIDI keyboard).
- `.mid` import with auto-generated difficulties (`@tonejs/midi`).
- Practice mode: slow down, loop sections, wait-for-note.
- 88-key mode, chart editor, leaderboards, touch support.
