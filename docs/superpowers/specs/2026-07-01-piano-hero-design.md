# Piano Hero 3D: Design Spec

Date: 2026-07-01
Status: Approved by user (conversation 2026-07-01)

## Vision

A Guitar Hero-style web experience focused on piano practice. Notes approach the player in a 3D concert-hall scene built with Three.js; the player performs them on the physical computer keyboard using a real piano-style mapping. The goal is a musical experience first, a game second: playing must feel natural, expressive, and rewarding.

## Decisions locked with the user

| Decision | Choice |
|----------|--------|
| Keyboard mapping | FL Studio convention, 2 full octaves (C3 to C5) |
| Audio | Sampled piano (Salamander Grand, public domain) via Tone.js Sampler |
| MVP content | 3 to 4 built-in JSON charts; MIDI import deferred to future work |
| Visual direction | Concert hall dark-luxury: black lacquer piano, warm ivory keys, amber/cyan emissive note gems, golden particle bursts, deep blue-black fog, selective bloom, stage lighting that scales with combo |
| Location | `Y:\work\piano-hero`, standalone static web app |
| Language | UI text in Spanish; all code, identifiers, comments, and technical docs in English |

## 1. Technical architecture

**Stack:** Vite + TypeScript (vanilla, no UI framework), Three.js for the 3D world, Tone.js for audio, DOM overlay for HUD and menus, Vitest for unit tests. No backend; fully static build.

**Core principle: the audio clock is the single source of truth for time.** `AudioContext.currentTime` drives song position and judgment; `requestAnimationFrame` only interpolates visuals. Input events are timestamped with `event.timeStamp` and converted to audio-clock time so frame drops never affect judgment.

### Module layout

```
src/
├── core/
│   ├── clock.ts        # SongClock: audio-clock based; start/pause/resume/seek
│   ├── input.ts        # KeyboardEvent.code -> NoteEvent {midi, on/off, time}
│   └── state.ts        # State machine: Menu -> Loading -> Playing -> Paused -> Results
├── audio/
│   └── piano.ts        # Tone.Sampler wrapper (Salamander); noteOn/noteOff; always sounds
├── game/
│   ├── chart.ts        # Chart JSON format, parser, validation
│   ├── judge.ts        # Timing windows, hold-note logic (pure functions)
│   └── scoring.ts      # Score, combo, multiplier, accuracy, rating (pure functions)
├── render/
│   ├── scene.ts        # Camera, lights, fog, postprocessing setup
│   ├── keyboard3d.ts   # 25-key 3D piano with real white/black geometry
│   ├── highway.ts      # 25-lane note highway, InstancedMesh note pool
│   └── effects.ts      # Particle bursts, key flashes, combo stage lighting
└── ui/
    └── hud.ts          # DOM HUD: score/combo/accuracy, menus, results screen
```

Constraints: `game/judge.ts` and `game/scoring.ts` are pure and import neither Three.js nor Tone.js, so they are unit-testable in Node. Files stay small and single-purpose.

### Chart format (JSON)

```json
{
  "title": "Fur Elise (simplified)",
  "bpm": 72,
  "difficulty": 2,
  "audioOffset": 0,
  "notes": [
    { "t": 0.0, "midi": 76, "d": 0.25, "hand": "R" },
    { "t": 0.25, "midi": 75, "d": 0.25, "hand": "R" }
  ]
}
```

`t` = seconds from song start, `midi` = MIDI note number (48 to 72 for C3..C5), `d` = duration in seconds (holds when >= 0.5), `hand` = R/L for note color.

## 2. Keyboard-to-piano mapping

FL Studio convention using `KeyboardEvent.code` (layout independent):

```
Upper octave (right hand):
   2  3     5  6  7          -> C#4 D#4   F#4 G#4 A#4
  Q  W  E  R  T  Y  U  I     -> C4 D4 E4 F4 G4 A4 B4 C5

Lower octave (left hand):
   S  D     G  H  J          -> C#3 D#3   F#3 G#3 A#3
  Z  X  C  V  B  N  M  ,     -> C3 D3 E3 F3 G3 A3 B3 C4
```

Musical-feel requirements:
- Full polyphony: N simultaneous keys, chords of 6+ notes.
- The piano ALWAYS sounds on key press, regardless of judgment. Expression is never muted; the game only evaluates.
- keydown = noteOn, keyup = noteOff with natural sample release (duration matters).
- Each 3D key shows its physical letter (toggleable in options).

## 3. Three.js scene and animation

**Composition:** perspective camera raised behind the piano, looking down a highway receding into fog. Notes spawn far away, travel toward the player, and must be struck as they cross the key line. The highway has 25 lanes matching real piano geometry (narrow raised lanes for black keys) so the visual-to-finger mapping is direct.

**Materials and atmosphere (dark-luxury):**
- Black lacquer piano body with environment reflections; warm ivory keys.
- Notes: emissive gem meshes via a single `InstancedMesh` (one draw call). Amber = right hand, cyan = left hand. Hold notes render a glowing tail.
- Deep blue-black fog, fake volumetric light cones (additive), reflective floor.
- Postprocessing: selective bloom (notes and bursts glow; the scene never washes out).

**Animated feedback:**
- Key press: 3D key dips with easing plus emissive flash.
- Perfect hit: golden particle burst plus lane shockwave.
- Combo tiers progressively light up the stage; breaking the combo dims it for half a second. Game state is readable without looking at the HUD.
- Object pools for notes and particles: zero allocations during gameplay; 60 fps target.

## 4. Note detection and timing

- Judgment windows: Perfect +/-50 ms, Great +/-100 ms, Good +/-150 ms, Miss beyond. Tunable per difficulty.
- Input latency handling: judge against `event.timeStamp` mapped to audio time, not frame time.
- Hold notes: hit the head, keep the key down for >= 90% of duration for full bonus.
- Chords: each note judged individually; all-Perfect chord grants a bonus.
- Wrong key: always sounds; breaks combo in normal mode; no penalty in practice mode.
- Calibration screen: tap-to-metronome test computes the player's combined audio+input offset, stored in localStorage.

**Scoring:** base points per judgment x combo multiplier (x1 to x4, stepping every 10 notes), accuracy percentage, final S/A/B/C rating with per-song stats.

## 5. MVP phases (each independently verifiable)

1. **Playable piano:** 3D scene + keyboard input + sampler. Verify: play Fur Elise by ear and it sounds like a real piano, chords included.
2. **Game loop:** chart parser + highway + falling notes + judgment + score/combo. Verify: judge/scoring unit tests green; one song playable start to results.
3. **Full experience:** effects, HUD, calibration, menu, results screen, 3 to 4 songs with progressive difficulty (Ode to Joy -> Fur Elise -> Canon in D -> Clair de Lune simplified).

## 6. Future work (explicitly out of MVP scope)

- Web MIDI API input (real MIDI keyboard; only the input layer changes).
- MIDI file import with `@tonejs/midi` plus auto-generated difficulty levels.
- Practice mode: reduced speed, section looping, wait mode (song pauses until correct note).
- 88-key mode with camera scroll, chart editor, leaderboards, touch support.

## Error handling

- Sample loading: loading screen with progress; retry on failure; clear Spanish error message if audio cannot initialize.
- AudioContext requires a user gesture: start audio on first interaction (menu click), standard autoplay-policy handling.
- Chart validation on load: reject malformed charts with a descriptive error instead of crashing mid-song.
- WebGL context loss: pause the game and show a recovery prompt.

## Testing

- Vitest unit tests for `judge.ts`, `scoring.ts`, `chart.ts` (pure logic): timing windows, combo math, hold grading, chart validation edge cases.
- Manual verification per MVP phase as listed above.
- Performance check: stable 60 fps with a dense chart (Chrome DevTools profiling).
