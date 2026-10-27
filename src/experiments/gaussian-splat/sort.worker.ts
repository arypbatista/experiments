// Back-to-front depth sort of splat centers, off the main thread.
// 16-bit counting sort: O(n), stable enough for alpha blending.

let positions: Float32Array | null = null;
let gen = 0;
let keys = new Uint16Array(0);
let depths = new Float32Array(0);
const counts = new Uint32Array(65536);

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === 'data') {
    positions = msg.positions as Float32Array;
    gen = msg.gen;
    const n = positions.length / 3;
    keys = new Uint16Array(n);
    depths = new Float32Array(n);
    return;
  }
  if (msg.type !== 'sort' || !positions || msg.gen !== gen) {
    self.postMessage({ type: 'skipped' });
    return;
  }

  const t0 = performance.now();
  const v = msg.view as Float32Array; // column-major modelView
  const n = positions.length / 3;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < n; i++) {
    const z = v[2] * positions[i * 3] + v[6] * positions[i * 3 + 1] + v[10] * positions[i * 3 + 2] + v[14];
    depths[i] = z;
    if (z < min) min = z;
    if (z > max) max = z;
  }

  // view-space z is negative in front of the camera: ascending z = farthest first
  const scale = 65535 / (max - min || 1);
  counts.fill(0);
  for (let i = 0; i < n; i++) {
    const k = ((depths[i] - min) * scale) | 0;
    keys[i] = k;
    counts[k]++;
  }
  for (let k = 0, sum = 0; k < 65536; k++) {
    const c = counts[k];
    counts[k] = sum;
    sum += c;
  }
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[counts[keys[i]]++] = i;

  self.postMessage({ type: 'sorted', order, gen, ms: performance.now() - t0 }, { transfer: [order.buffer] });
};
