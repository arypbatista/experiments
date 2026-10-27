// Pinscreen mode: ~16k instanced nickel pins in a black board, pushed out by
// the ink. Real geometry, so it's lit by a shadow-casting key light + a
// PMREM'd RoomEnvironment for the metal reflections.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { boxBlur, rng, type InkMap } from '../../lib/ink';

export const PINS_X = 96;     // pins across the drawing
export const PIN_MAX = 30;    // max protrusion (scene units; drawing is 569 wide)
const SHAFT = 60;

export function createPinScene(renderer: THREE.WebGLRenderer, { w, h, ink }: InkMap) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0a0b');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;

  const pitch = w / PINS_X;
  const NX = PINS_X, NY = Math.round(h / pitch), COUNT = NX * NY;

  // pin = flattened dome head + thin shaft running back through the board
  const head = new THREE.SphereGeometry(pitch * 0.47, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  head.rotateX(Math.PI / 2);
  head.scale(1, 1, 0.55);
  const shaft = new THREE.CylinderGeometry(pitch * 0.13, pitch * 0.13, SHAFT, 8, 1, true);
  shaft.rotateX(Math.PI / 2);
  shaft.translate(0, 0, -SHAFT / 2);
  const geo = mergeGeometries([head, shaft])!;

  const mat = new THREE.MeshStandardMaterial({ color: '#b8b2a8', metalness: 1, roughness: 0.32 });
  const pins = new THREE.InstancedMesh(geo, mat, COUNT);
  pins.castShadow = pins.receiveShadow = true;
  pins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(pins);

  // target heights: ink averaged over each pin's footprint
  const soft = boxBlur(boxBlur(ink, w, h, 2), w, h, 2);
  const raw = new Float32Array(COUNT);
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const x = Math.min(w - 1, Math.round((i + 0.5) * pitch));
      const y = Math.min(h - 1, Math.round((j + 0.5) * pitch));
      raw[j * NX + i] = soft[y * w + x];
    }
  const sorted = Array.from(raw).sort((a, b) => a - b);
  const top = sorted[Math.floor(COUNT * 0.985)] || 1;
  const rand = rng(7);
  const px = new Float32Array(COUNT), py = new Float32Array(COUNT);
  const target = new Float32Array(COUNT), delay = new Float32Array(COUNT);
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      px[k] = (i + 0.5) * pitch - w / 2;
      py[k] = h / 2 - (j + 0.5) * pitch;
      const v = Math.min(1, raw[k] / top);
      target[k] = 0.6 + PIN_MAX * Math.pow(v, 0.8) + (rand() - 0.5) * 0.4; // pins never sit perfectly even
      delay[k] = (j / NY) * 1.1 + rand() * 0.25;
    }

  const arr = pins.instanceMatrix.array as Float32Array;
  for (let k = 0; k < COUNT; k++) {
    arr.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, px[k], py[k], 0.6, 1], k * 16);
  }

  // board, frame and the table it lies on
  const BW = w + pitch * 4, BH = h + pitch * 4;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(BW, BH),
    new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.55, metalness: 0.2 }),
  );
  board.receiveShadow = true;
  scene.add(board);
  const frameMat = new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.35, metalness: 0.1 });
  const F = 22, FD = 14;
  for (const [x, y, sw, sh] of [
    [0, BH / 2 + F / 2, BW + F * 2, F], [0, -BH / 2 - F / 2, BW + F * 2, F],
    [BW / 2 + F / 2, 0, F, BH], [-BW / 2 - F / 2, 0, F, BH],
  ]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, FD + 20), frameMat);
    bar.position.set(x, y, FD / 2 - 10);
    bar.castShadow = bar.receiveShadow = true;
    scene.add(bar);
  }
  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshStandardMaterial({ color: '#1a1816', roughness: 0.9 }),
  );
  table.position.z = -10;
  table.receiveShadow = true;
  scene.add(table);

  scene.add(new THREE.HemisphereLight(0x8a8f99, 0x0a0806, 0.1));
  const sun = new THREE.DirectionalLight(0xfff0dc, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  const S = Math.max(BW, BH) * 0.62;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 3000 });
  scene.add(sun, sun.target);

  // pins rise from the board, top row first, with a small spring overshoot
  let start = -1, settled = false;
  const backOut = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
  const still = location.search.includes('still'); // skip the intro (screenshots)
  function replay() { start = still ? -100 : -1; settled = false; }
  function update(time: number) {
    if (start === -100) start = time - 10;
    else if (start < 0) start = time;
    const t = time - start;
    if (settled) return;
    settled = t > 2.6; // one last pass at full height, then stop touching the buffer
    for (let k = 0; k < COUNT; k++) {
      const l = Math.min(1, Math.max(0, (t - delay[k]) / 0.9));
      arr[k * 16 + 14] = 0.6 + (target[k] - 0.6) * backOut(l);
    }
    pins.instanceMatrix.needsUpdate = true;
  }

  // light sits above the cursor's point on the board: off-centre = more raking
  function setLight(x: number, y: number, elev: number) {
    sun.position.set(x, y, elev);
  }

  return { scene, update, replay, setLight, size: { w: BW + F * 2, h: BH + F * 2 } };
}
