import * as THREE from 'three';
import { MIDI_MIN, MIDI_MAX, isBlackKey, labelForMidi } from '../core/mapping';

export const WHITE_PITCH = 1.05;
const WHITE_WIDTH = 0.95;
const BLACK_WIDTH = 0.6;
const PRESS_DIP = 0.12;
const FLASH_DECAY = 4;

let whiteCount = 0;
for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
  if (!isBlackKey(midi)) whiteCount++;
}
const WHITE_CENTER = (whiteCount - 1) / 2;
export const KEYBOARD_WIDTH = whiteCount * WHITE_PITCH + 1;

interface KeyEntry {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  baseY: number;
  pressed: boolean;
  flash: number;
  black: boolean;
}

export interface Keyboard3D {
  group: THREE.Group;
  laneX(midi: number): number;
  laneWidth(midi: number): number;
  press(midi: number): void;
  release(midi: number): void;
  update(dt: number): void;
}

function makeLabelSprite(text: string): THREE.Sprite {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(120, 116, 104, 0.9)';
  ctx.font = 'bold 40px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(0.5, 0.5, 1);
  return sprite;
}

export function createKeyboard(scene: THREE.Scene): Keyboard3D {
  const group = new THREE.Group();
  const keys = new Map<number, KeyEntry>();
  const laneXByMidi = new Map<number, number>();

  const whiteGeometry = new THREE.BoxGeometry(WHITE_WIDTH, 0.5, 5.2);
  const blackGeometry = new THREE.BoxGeometry(BLACK_WIDTH, 0.55, 3.2);

  let whiteIndex = 0;
  let lastWhiteX = 0;
  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const black = isBlackKey(midi);
    let x: number;
    let mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    if (black) {
      x = lastWhiteX + WHITE_PITCH / 2;
      mesh = new THREE.Mesh(
        blackGeometry,
        new THREE.MeshStandardMaterial({
          color: 0x11131a, metalness: 0.5, roughness: 0.22,
          emissive: 0x4dd7ff, emissiveIntensity: 0,
        }),
      );
      mesh.position.set(x, 0.62, 1.6);
    } else {
      x = (whiteIndex - WHITE_CENTER) * WHITE_PITCH;
      lastWhiteX = x;
      whiteIndex++;
      mesh = new THREE.Mesh(
        whiteGeometry,
        new THREE.MeshStandardMaterial({
          color: 0xf2ead8, roughness: 0.35,
          emissive: 0xffb347, emissiveIntensity: 0,
        }),
      );
      mesh.position.set(x, 0.25, 2.6);
    }
    group.add(mesh);
    keys.set(midi, { mesh, baseY: mesh.position.y, pressed: false, flash: 0, black });
    laneXByMidi.set(midi, x);

    const label = makeLabelSprite(labelForMidi(midi));
    label.position.set(x, black ? 0.95 : 0.6, black ? 3.0 : 4.7);
    group.add(label);
  }

  // Piano body: low lacquer sill behind the keys so incoming notes stay visible
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(KEYBOARD_WIDTH, 0.9, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x0b0c12, metalness: 0.8, roughness: 0.15 }),
  );
  body.position.set(0, 0.45, -0.7);
  group.add(body);
  const felt = new THREE.Mesh(
    new THREE.BoxGeometry(KEYBOARD_WIDTH - 1.3, 0.06, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x8a1f2b, roughness: 0.9 }),
  );
  felt.position.set(0, 0.56, -0.05);
  group.add(felt);

  scene.add(group);

  return {
    group,
    laneX(midi: number): number {
      return laneXByMidi.get(midi) ?? 0;
    },
    laneWidth(midi: number): number {
      return isBlackKey(midi) ? 0.55 : 0.8;
    },
    press(midi: number): void {
      const key = keys.get(midi);
      if (!key) return;
      key.pressed = true;
      key.flash = 1;
    },
    release(midi: number): void {
      const key = keys.get(midi);
      if (!key) return;
      key.pressed = false;
    },
    update(dt: number): void {
      for (const key of keys.values()) {
        const targetY = key.baseY - (key.pressed ? PRESS_DIP : 0);
        key.mesh.position.y += (targetY - key.mesh.position.y) * Math.min(1, dt * 18);
        if (!key.pressed) key.flash = Math.max(0, key.flash - dt * FLASH_DECAY);
        key.mesh.material.emissiveIntensity = key.flash * (key.black ? 1.2 : 0.7);
      }
    },
  };
}
