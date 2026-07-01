import * as THREE from 'three';
import { MIDI_MIN, MIDI_MAX, isBlackKey, labelForMidi } from '../core/mapping';
import type { TrackedNote } from '../game/judge';

export const NOTE_SPEED = 18; // world units per second toward the player
const LOOKAHEAD_SECONDS = 3.5;
const TRAIL_SECONDS = 0.15;
const POOL_SIZE = 200;

export interface Highway {
  group: THREE.Group;
  update(songTime: number, notes: readonly TrackedNote[]): void;
}

interface NotePool {
  mesh: THREE.InstancedMesh;
  count: number;
}

function createNotePool(group: THREE.Group, color: number, emissiveIntensity: number): NotePool {
  const geometry = new THREE.BoxGeometry(1, 0.32, 1);
  const material = new THREE.MeshStandardMaterial({
    color, metalness: 0.3, roughness: 0.25,
    emissive: color, emissiveIntensity,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, POOL_SIZE);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  group.add(mesh);
  return { mesh, count: 0 };
}

export function createHighway(
  scene: THREE.Scene,
  laneX: (midi: number) => number,
  laneWidth: (midi: number) => number,
): Highway {
  const group = new THREE.Group();

  // Highway bed
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(17.5, 70),
    new THREE.MeshStandardMaterial({ color: 0x090b12, metalness: 0.6, roughness: 0.7 }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, 0.02, -35);
  group.add(bed);

  // Lane separator lines at white-key boundaries
  const linePositions: number[] = [];
  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    if (isBlackKey(midi)) continue;
    const edge = laneX(midi) - 1.05 / 2;
    linePositions.push(edge, 0.03, 0, edge, 0.03, -70);
  }
  const rightEdge = laneX(MIDI_MAX) + 1.05 / 2;
  linePositions.push(rightEdge, 0.03, 0, rightEdge, 0.03, -70);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  group.add(new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: 0x1c2230, transparent: true, opacity: 0.7 }),
  ));

  // Strike bar: where notes must be hit
  const strikeBar = new THREE.Mesh(
    new THREE.BoxGeometry(17.5, 0.06, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xfff2dd, emissive: 0xffd9a0, emissiveIntensity: 1.6,
      metalness: 0.2, roughness: 0.4,
    }),
  );
  strikeBar.position.set(0, 0.97, -0.12);
  group.add(strikeBar);

  // One instanced pool per visual class so each keeps its own emissive color
  const rightPool = createNotePool(group, 0xffb347, 1.4);
  const leftPool = createNotePool(group, 0x4dd7ff, 1.4);
  const missedPool = createNotePool(group, 0x3a3f4a, 0.15);

  // Letter sprites riding on each falling note: the player reads WHICH physical
  // key to press directly on the note, which keeps the game piano-intuitive
  const labelTextures = new Map<number, THREE.CanvasTexture>();
  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.95)';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelForMidi(midi), size / 2, size / 2);
    labelTextures.set(midi, new THREE.CanvasTexture(canvas));
  }
  const MAX_LABELS = 64;
  const labelSprites: THREE.Sprite[] = [];
  for (let i = 0; i < MAX_LABELS; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ transparent: true, depthWrite: false }),
    );
    sprite.scale.set(0.72, 0.72, 1);
    sprite.visible = false;
    group.add(sprite);
    labelSprites.push(sprite);
  }
  let labelCount = 0;

  scene.add(group);

  // Reusable temps: zero allocations inside update
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const parked = new THREE.Matrix4().compose(
    new THREE.Vector3(0, -10, 0),
    quaternion,
    new THREE.Vector3(0, 0, 0),
  );

  function place(pool: NotePool, note: TrackedNote, songTime: number, withLabel: boolean): void {
    if (pool.count >= POOL_SIZE) return;
    let headZ = -(note.t - songTime) * NOTE_SPEED;
    const tailZ = -(note.t + note.d - songTime) * NOTE_SPEED;
    // A hold being played is consumed at the strike line instead of sliding on
    if (note.holding) headZ = Math.min(headZ, 0);
    const length = Math.max(0.8, headZ - tailZ);
    const black = isBlackKey(note.midi);
    const y = black ? 1.2 : 1.0;
    position.set(laneX(note.midi), y, headZ - length / 2);
    scale.set(laneWidth(note.midi), 1, length);
    matrix.compose(position, quaternion, scale);
    pool.mesh.setMatrixAt(pool.count, matrix);
    pool.count++;
    if (withLabel && labelCount < MAX_LABELS && headZ < -1) {
      const sprite = labelSprites[labelCount++];
      sprite.material.map = labelTextures.get(note.midi) ?? null;
      sprite.position.set(laneX(note.midi), y + 0.28, headZ - 0.4);
      sprite.visible = true;
    }
  }

  return {
    group,
    update(songTime: number, notes: readonly TrackedNote[]): void {
      rightPool.count = 0;
      leftPool.count = 0;
      missedPool.count = 0;
      labelCount = 0;
      for (const note of notes) {
        if (note.t + note.d < songTime - TRAIL_SECONDS) continue;
        if (note.t > songTime + LOOKAHEAD_SECONDS) break;
        if (note.state === 'hit' && !note.holding) continue;
        if (note.state === 'missed') {
          // Missed notes vanish shortly after crossing the line
          if (songTime - note.t > TRAIL_SECONDS) continue;
          place(missedPool, note, songTime, false);
        } else {
          place(note.hand === 'R' ? rightPool : leftPool, note, songTime, true);
        }
      }
      for (const pool of [rightPool, leftPool, missedPool]) {
        for (let i = pool.count; i < POOL_SIZE; i++) pool.mesh.setMatrixAt(i, parked);
        pool.mesh.instanceMatrix.needsUpdate = true;
      }
      for (let i = labelCount; i < MAX_LABELS; i++) labelSprites[i].visible = false;
    },
  };
}
