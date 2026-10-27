// Turns the ink bitmap into a set of polylines ("threads") that follow the strokes.
//
// 1. A chamfer distance transform gives, for every ink pixel, the distance to the
//    nearest paper pixel: half the local stroke thickness.
// 2. Seeds are visited in random order. From each uncovered seed the walker finds
//    the local stroke direction (longest ink run through the seed) and walks both
//    ways, preferring straight continuation, the stroke's centre line and pixels
//    no other thread has claimed yet.
// 3. Accepted threads stamp a coverage map so the next ones fill other strokes.
// 4. Threads are ordered into a single nearest-neighbour tour (flipping where
//    needed) so the whole drawing can also behave as one continuous yarn.

import { rng } from '../../lib/ink';

export const SEG = 3; // walk step / rest segment length, in drawing px

export interface TracedThread {
  pts: number[]; // x0,y0,x1,y1,...
  width: number; // stroke width in drawing px
}

export function distanceTransform(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e6;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  const D = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1); else v = Math.min(v, 1);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 1);
        if (x > 0) v = Math.min(v, d[i - w - 1] + D);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + D);
      } else v = Math.min(v, 1);
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1); else v = Math.min(v, 1);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 1);
        if (x > 0) v = Math.min(v, d[i + w - 1] + D);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + D);
      } else v = Math.min(v, 1);
      d[i] = v;
    }
  }
  return d;
}

export function traceThreads(ink: Float32Array, w: number, h: number, opts: { maxPoints?: number; maxHalf?: number } = {}): TracedThread[] {
  const MAX_POINTS = opts.maxPoints ?? 42000;
  const MAX_HALF = opts.maxHalf ?? 48;
  const rand = rng(7);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = ink[i] > 0.45 ? 1 : 0;
  const dt = distanceTransform(mask, w, h);
  const cov = new Float32Array(w * h);

  const ok = (x: number, y: number) => {
    const xi = x | 0, yi = y | 0;
    return xi >= 0 && yi >= 0 && xi < w && yi < h && mask[yi * w + xi] === 1;
  };
  const at = (arr: Float32Array, x: number, y: number) => arr[(y | 0) * w + (x | 0)];

  // direction of the longest ink run through (x, y)
  function strokeAngle(x: number, y: number) {
    let bestA = 0, bestRun = -1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI;
      const c = Math.cos(a), s = Math.sin(a);
      let run = 0;
      for (let j = 1; j <= 18 && ok(x + c * j, y + s * j); j++) run++;
      for (let j = 1; j <= 18 && ok(x - c * j, y - s * j); j++) run++;
      if (run > bestRun) { bestRun = run; bestA = a; }
    }
    return bestA;
  }

  function walk(x: number, y: number, a: number): number[] {
    const out: number[] = [];
    let overlap = 0;
    for (let step = 0; step < MAX_HALF; step++) {
      let best = -1e9, bx = 0, by = 0, ba = 0;
      for (let k = -4; k <= 4; k++) {
        const ca = a + k * 0.19;
        const nx = x + Math.cos(ca) * SEG, ny = y + Math.sin(ca) * SEG;
        if (!ok(nx, ny)) continue;
        const sc = Math.cos(k * 0.19) * 1.4 + Math.min(at(dt, nx, ny), 4) * 0.18 - at(cov, nx, ny) * 1.6 + rand() * 0.12;
        if (sc > best) { best = sc; bx = nx; by = ny; ba = ca; }
      }
      if (best === -1e9) break;
      if (at(cov, bx, by) > 0.5) { if (++overlap > 3) break; } else overlap = 0;
      x = bx; y = by; a = ba;
      out.push(x, y);
    }
    if (overlap > 0) out.length = Math.max(0, out.length - overlap * 2);
    return out;
  }

  function stamp(x: number, y: number, r: number) {
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(w - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(h - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx - x, dy = yy - y;
        if (dx * dx + dy * dy <= r2) cov[yy * w + xx] = 1;
      }
    }
  }

  // shuffled ink pixels as seeds
  const seeds: number[] = [];
  for (let i = 0; i < w * h; i++) if (mask[i]) seeds.push(i);
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = seeds[i]; seeds[i] = seeds[j]; seeds[j] = t;
  }

  const threads: TracedThread[] = [];
  let total = 0;
  for (const si of seeds) {
    if (total >= MAX_POINTS) break;
    if (cov[si] > 0) continue;
    const sx = (si % w) + 0.5, sy = ((si / w) | 0) + 0.5;
    const a = strokeAngle(sx, sy);
    const fwd = walk(sx, sy, a);
    const back = walk(sx, sy, a + Math.PI);
    const pts: number[] = [];
    for (let i = back.length - 2; i >= 0; i -= 2) pts.push(back[i], back[i + 1]);
    pts.push(sx, sy, ...fwd);
    const n = pts.length / 2;
    if (n < 5) { cov[si] = 1; continue; }
    let wsum = 0;
    for (let i = 0; i < n; i++) {
      const x = pts[i * 2], y = pts[i * 2 + 1];
      const pw = Math.min(8, Math.max(1, at(dt, x, y) * 2));
      wsum += pw;
      stamp(x, y, pw / 2 + 0.6);
    }
    threads.push({ pts, width: Math.max(0.9, (wsum / n) * 0.85) });
    total += n;
  }

  // nearest-neighbour tour, flipping threads so each one starts near the previous end
  const T = threads.length;
  const used = new Uint8Array(T);
  const order: TracedThread[] = [];
  let cur = 0;
  for (let i = 1; i < T; i++) if (threads[i].pts[1] < threads[cur].pts[1]) cur = i;
  used[cur] = 1;
  order.push(threads[cur]);
  for (let k = 1; k < T; k++) {
    const last = order[order.length - 1].pts;
    const ex = last[last.length - 2], ey = last[last.length - 1];
    let best = -1, bestD = Infinity, flip = false;
    for (let i = 0; i < T; i++) {
      if (used[i]) continue;
      const p = threads[i].pts;
      const d0 = (p[0] - ex) ** 2 + (p[1] - ey) ** 2;
      const d1 = (p[p.length - 2] - ex) ** 2 + (p[p.length - 1] - ey) ** 2;
      if (d0 < bestD) { bestD = d0; best = i; flip = false; }
      if (d1 < bestD) { bestD = d1; best = i; flip = true; }
    }
    used[best] = 1;
    const t = threads[best];
    if (flip) {
      const r: number[] = [];
      for (let i = t.pts.length - 2; i >= 0; i -= 2) r.push(t.pts[i], t.pts[i + 1]);
      t.pts = r;
    }
    order.push(t);
  }
  return order;
}
