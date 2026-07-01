import * as THREE from 'three';
import type { Judgment } from '../game/scoring';

const BURST_POOL = 512;
const BURST_COUNT = 26;
const RING_POOL = 6;
const DUST_COUNT = 320;
const GOLD = new THREE.Color(0xffd27a);
const CYAN = new THREE.Color(0x7fd8ff);
const SOFT = new THREE.Color(0x9aa4c0);

export interface Effects {
  burst(x: number, judgment: Judgment, hand: 'R' | 'L'): void;
  shockwave(x: number): void;
  update(dt: number): void;
}

export function createEffects(scene: THREE.Scene): Effects {
  // Hit burst particles
  const positions = new Float32Array(BURST_POOL * 3);
  const colors = new Float32Array(BURST_POOL * 3);
  const velocities = new Float32Array(BURST_POOL * 3);
  const life = new Float32Array(BURST_POOL);
  positions.fill(-999);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.16, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0;

  // Shockwave rings at the strike line
  const rings: { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; age: number }[] = [];
  for (let i = 0; i < RING_POOL; i++) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.5, 40),
      new THREE.MeshBasicMaterial({
        color: 0xffe4b0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 1.02, -0.12);
    mesh.visible = false;
    scene.add(mesh);
    rings.push({ mesh, age: 1 });
  }

  // Ambient dust: slow-drifting motes that give the stage depth
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 26;
    dustPositions[i * 3 + 1] = Math.random() * 11;
    dustPositions[i * 3 + 2] = 5 - Math.random() * 60;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      size: 0.06, color: 0x8899bb, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  dust.frustumCulled = false;
  scene.add(dust);

  return {
    burst(x: number, judgment: Judgment, hand: 'R' | 'L'): void {
      const base = judgment === 'good' ? SOFT : hand === 'R' ? GOLD : CYAN;
      const count = judgment === 'perfect' ? BURST_COUNT : Math.floor(BURST_COUNT * 0.6);
      for (let n = 0; n < count; n++) {
        const i = cursor;
        cursor = (cursor + 1) % BURST_POOL;
        positions[i * 3] = x;
        positions[i * 3 + 1] = 1.1;
        positions[i * 3 + 2] = -0.1;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        velocities[i * 3] = Math.cos(angle) * speed * 0.7;
        velocities[i * 3 + 1] = 2 + Math.random() * 3.5;
        velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.5;
        life[i] = 0.7 + Math.random() * 0.3;
        colors[i * 3] = base.r;
        colors[i * 3 + 1] = base.g;
        colors[i * 3 + 2] = base.b;
      }
    },

    shockwave(x: number): void {
      const ring = rings.find((r) => !r.mesh.visible);
      if (!ring) return;
      ring.age = 0;
      ring.mesh.position.x = x;
      ring.mesh.visible = true;
    },

    update(dt: number): void {
      for (let i = 0; i < BURST_POOL; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) {
          positions[i * 3 + 1] = -999;
          continue;
        }
        velocities[i * 3 + 1] -= 7 * dt; // gravity
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      for (const ring of rings) {
        if (!ring.mesh.visible) continue;
        ring.age += dt;
        const t = ring.age / 0.45;
        if (t >= 1) {
          ring.mesh.visible = false;
          continue;
        }
        const s = 1 + t * 6;
        ring.mesh.scale.set(s, s, 1);
        ring.mesh.material.opacity = 0.85 * (1 - t);
      }

      for (let i = 0; i < DUST_COUNT; i++) {
        dustPositions[i * 3 + 1] += dt * 0.25;
        if (dustPositions[i * 3 + 1] > 11) dustPositions[i * 3 + 1] = 0;
      }
      dustGeometry.attributes.position.needsUpdate = true;
    },
  };
}
