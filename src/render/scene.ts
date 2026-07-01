import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const BG_COLOR = 0x05070d;
const CONE_COLOR = 0xffb347;
const CONE_MAX_OPACITY = 0.1;
const BLOOM_BASE = 0.35;
const BLOOM_MAX = 0.75;

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  setComboTier(tier: number): void;
  render(dt: number): void;
  resize(): void;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(BG_COLOR, 25, 70);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 11, 15.5);
  camera.lookAt(0, 0, -13);

  scene.add(new THREE.AmbientLight(0x223044, 1.1));
  const keyLight = new THREE.DirectionalLight(0xffe0b0, 1.25);
  keyLight.position.set(6, 14, 8);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x4dd7ff, 30, 60);
  rimLight.position.set(0, 6, -30);
  scene.add(rimLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x0a0c12, metalness: 0.85, roughness: 0.4 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  scene.add(floor);

  const coneGeometry = new THREE.CylinderGeometry(0.5, 3.5, 18, 16, 1, true);
  const cones: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>[] = [];
  for (const x of [-9, -3, 3, 9]) {
    const material = new THREE.MeshBasicMaterial({
      color: CONE_COLOR,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cone = new THREE.Mesh(coneGeometry, material);
    cone.position.set(x, 9, -18);
    cone.rotation.z = x * 0.01;
    scene.add(cone);
    cones.push(cone);
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_BASE, 0.5, 1.0,
  );
  composer.addPass(bloom);

  let targetTier = 0;
  let currentTier = 0;

  return {
    scene,
    camera,
    renderer,
    setComboTier(tier: number): void {
      targetTier = Math.max(0, Math.min(3, tier));
    },
    render(dt: number): void {
      currentTier += (targetTier - currentTier) * Math.min(1, dt * 4);
      const level = currentTier / 3;
      bloom.strength = BLOOM_BASE + (BLOOM_MAX - BLOOM_BASE) * level;
      for (const cone of cones) cone.material.opacity = CONE_MAX_OPACITY * level;
      composer.render();
    },
    resize(): void {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    },
  };
}
