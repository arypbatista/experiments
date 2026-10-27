// Endless Totem — a seam-stitched stack of "units" (masks, heads, bands)
// carved from one ink drawing. Units overlap vertically; inside each overlap a
// minimum-cost seam (image quilting) decides where one unit ends and the next
// begins, so the cut follows paper gaps or runs along strokes that line up.

import { rng, INK_RGB } from '../../lib/ink';

export const COL_W = 820;     // world width of the column (drawing px)
export const OVERLAP = 110;   // rows shared by two neighbouring units
const CANDIDATES = 7;         // source windows tried per unit; best seam wins
const EDGE_PEN = 0.6;         // keeps seams away from the hard band edges
const FEATHER = 1.5;          // px of soft edge; both sides overlap ~1px so joins never go pale

export type Kind = 'mask' | 'head' | 'band';

export interface Unit {
  kind: Kind;
  H: number;      // full height including both overlaps (world px)
  sy: number;     // source window top
  sh: number;     // source window height
  sx: number;     // mask: mirror axis in source x
  hw: number;     // mask: half width in source px
  right: boolean; // mask: mirror the right half instead of the left
  flip: boolean;
  rot: number;
  dx: number;
  scaleX: number;
  scaleY: number;
}

export interface Tile {
  canvas: HTMLCanvasElement;
  born: number;
}

const HEIGHTS: Record<Kind, [number, number]> = {
  mask: [400, 480],
  head: [310, 390],
  band: [235, 270],
};

export class Totem {
  readonly units = new Map<number, Unit>();
  readonly y0 = new Map<number, number>();     // world y of unit top (y grows downward; k+1 is above k)
  readonly seams = new Map<number, Int16Array>(); // seam k: between unit k (below) and k+1 (above)
  readonly tiles = new Map<number, Tile>();
  readonly fading: { k: number; canvas: HTMLCanvasElement; born: number }[] = [];
  private inks = new Map<number, Float32Array>();
  private rolls = new Map<number, number>();
  private lo = 0;
  private hi = 0;
  private scratch: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private phase: number;

  constructor(private img: HTMLImageElement, private seed: number) {
    this.scratch = document.createElement('canvas');
    this.scratch.width = COL_W;
    this.sctx = this.scratch.getContext('2d', { willReadFrequently: true })!;
    this.sctx.imageSmoothingQuality = 'high';
    this.phase = rng(seed)() * 10;
    const r = this.rand(0, 0);
    const kind: Kind = 'mask';
    this.units.set(0, this.makeUnit(0, kind, this.pickHeight(kind, r), r));
    this.y0.set(0, 0);
  }

  private rand(k: number, roll: number) {
    const r = rng(this.seed * 7 + k * 7919 + roll * 104729);
    r(); r();
    return r;
  }

  private pickHeight(kind: Kind, r: () => number) {
    const [a, b] = HEIGHTS[kind];
    return Math.round(a + r() * (b - a));
  }

  // Rhythm: masks punctuate, bands separate, heads fill — never two masks in a row
  private nextKind(prev: Kind, r: () => number): Kind {
    const v = r();
    if (prev === 'mask') return v < 0.4 ? 'band' : 'head';
    if (prev === 'band') return v < 0.5 ? 'mask' : 'head';
    return v < 0.32 ? 'mask' : v < 0.62 ? 'band' : 'head';
  }

  private makeUnit(k: number, kind: Kind, H: number, r: () => number): Unit {
    const iw = this.img.width, ih = this.img.height;
    const sway = 22 * Math.sin(k * 0.55 + this.phase) + 10 * Math.sin(k * 1.7 + this.phase * 2);
    let s: number, aniso: number;
    if (kind === 'mask') { s = 0.95 + r() * 0.4; aniso = 1; }
    else if (kind === 'head') { s = 0.85 + r() * 0.4; aniso = 0.92 + r() * 0.18; }
    else { s = 0.9 + r() * 0.35; aniso = 1.08 + r() * 0.2; }
    const sh = Math.min(ih, H / s);
    const scaleY = H / sh;
    let scaleX = scaleY * aniso;
    const sy = r() * (ih - sh);
    const right = r() < 0.5;
    // mirror axis inside the mass; the half always reaches the paper margin
    // so the outer contour of the drawing becomes the mask's silhouette
    const sx = iw * (0.4 + r() * 0.2);
    const hw = right ? iw - sx : sx;
    const width = kind === 'mask' ? 2 * hw : iw;
    scaleX = Math.min(scaleX, (COL_W - 70) / width);
    return {
      kind, H, sy, sh, sx, hw, right,
      flip: r() < 0.5,
      rot: kind === 'mask' ? 0 : (r() - 0.5) * (kind === 'band' ? 0.05 : 0.11),
      dx: sway + (kind === 'mask' ? 0 : (r() - 0.5) * 18),
      scaleX, scaleY,
    };
  }

  // Ink field (0 paper … 1 ink) of rows [from, to) of a unit, in unit-local coords
  private renderInk(u: Unit, from: number, to: number): Float32Array {
    const h = to - from;
    const c = this.scratch, ctx = this.sctx;
    if (c.height !== h) c.height = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, COL_W, h);
    ctx.translate(COL_W / 2 + u.dx, u.H / 2 - from);
    ctx.rotate(u.rot);
    const img = this.img;
    if (u.kind === 'mask') {
      ctx.scale(u.scaleX, u.scaleY);
      const srcX = u.right ? u.sx : u.sx - u.hw;
      const dstX = u.right ? -0.5 : -u.hw;
      for (let m = 0; m < 2; m++) {
        ctx.drawImage(img, srcX, u.sy, u.hw, u.sh, dstX, -u.sh / 2, u.hw + 0.5, u.sh);
        ctx.scale(-1, 1);
      }
    } else {
      ctx.scale(u.scaleX * (u.flip ? -1 : 1), u.scaleY);
      ctx.drawImage(img, 0, u.sy, img.width, u.sh, -img.width / 2, -u.sh / 2, img.width, u.sh);
    }
    const d = ctx.getImageData(0, 0, COL_W, h).data;
    const out = new Float32Array(COL_W * h);
    for (let i = 0; i < out.length; i++) out[i] = 1 - d[i * 4] / 255;
    return out;
  }

  private ink(k: number) {
    let f = this.inks.get(k);
    if (!f) {
      const u = this.units.get(k)!;
      f = this.renderInk(u, 0, u.H);
      this.inks.set(k, f);
    }
    return f;
  }

  private topBand(k: number) { return this.ink(k).subarray(0, COL_W * OVERLAP); }
  private bottomBand(k: number) {
    const f = this.ink(k), H = this.units.get(k)!.H;
    return f.subarray(COL_W * (H - OVERLAP));
  }

  // Minimum-cost horizontal path through the overlap band. upper/lower are
  // the two units' ink in band coordinates (row 0 = band top).
  private seam(upper: Float32Array, lower: Float32Array, wantPath: boolean) {
    const W = COL_W, O = OVERLAP;
    const M = new Float32Array(W * O);
    const B = wantPath ? new Int8Array(W * O) : null;
    const pen = new Float32Array(O);
    for (let t = 0; t < O; t++) pen[t] = EDGE_PEN * (Math.max(0, 1 - t / 14) + Math.max(0, 1 - (O - 1 - t) / 14));
    for (let t = 0; t < O; t++) {
      const d = upper[t * W] - lower[t * W];
      M[t] = d * d + pen[t];
    }
    for (let x = 1; x < W; x++) {
      const p = (x - 1) * O, q = x * O;
      for (let t = 0; t < O; t++) {
        let best = M[p + t], bi = 0;
        if (t > 0 && M[p + t - 1] < best) { best = M[p + t - 1]; bi = -1; }
        if (t < O - 1 && M[p + t + 1] < best) { best = M[p + t + 1]; bi = 1; }
        const d = upper[t * W + x] - lower[t * W + x];
        M[q + t] = best + d * d + pen[t];
        if (B) B[q + t] = bi;
      }
    }
    let end = 0, cost = Infinity;
    const last = (W - 1) * O;
    for (let t = 0; t < O; t++) if (M[last + t] < cost) { cost = M[last + t]; end = t; }
    let path: Int16Array | null = null;
    if (B) {
      path = new Int16Array(W);
      let t = end;
      for (let x = W - 1; x >= 0; x--) { path[x] = t; t += B[x * O + t]; }
    }
    return { cost, path };
  }

  // Grow the chain up to index k (either direction), choosing each new unit
  // among several candidates by how well it stitches to its neighbour.
  ensure(k: number) {
    while (this.hi < k) this.grow(this.hi + 1, this.hi);
    while (this.lo > k) this.grow(this.lo - 1, this.lo);
  }

  private grow(k: number, nb: number) {
    const up = k > nb;
    const prev = this.units.get(nb)!;
    const r = this.rand(k, 0);
    const kind = this.nextKind(prev.kind, r);
    const H = this.pickHeight(kind, r);
    const nbBand = up ? this.topBand(nb) : this.bottomBand(nb);
    let best: Unit | null = null, bestCost = Infinity;
    for (let c = 0; c < CANDIDATES; c++) {
      const u = this.makeUnit(k, kind, H, r);
      const band = up ? this.renderInk(u, H - OVERLAP, H) : this.renderInk(u, 0, OVERLAP);
      const { cost } = up ? this.seam(band, nbBand, false) : this.seam(nbBand, band, false);
      if (cost < bestCost) { bestCost = cost; best = u; }
    }
    this.units.set(k, best!);
    if (up) {
      this.y0.set(k, this.y0.get(nb)! + OVERLAP - H);
      this.seams.set(nb, this.seam(this.bottomBand(k), this.topBand(nb), true).path!);
      this.hi = k;
    } else {
      this.y0.set(k, this.y0.get(nb)! + prev.H - OVERLAP);
      this.seams.set(k, this.seam(this.bottomBand(nb), this.topBand(k), true).path!);
      this.lo = k;
    }
  }

  // Seam-masked RGBA tile for unit k
  tile(k: number, now: number): Tile {
    const hit = this.tiles.get(k);
    if (hit) return hit;
    this.ensure(k + 1);
    this.ensure(k - 1);
    const u = this.units.get(k)!;
    const f = this.ink(k);
    const top = this.seams.get(k)!;      // with unit above, local row = t
    const bot = this.seams.get(k - 1)!;  // with unit below, local row = H - O + t
    const c = document.createElement('canvas');
    c.width = COL_W; c.height = u.H;
    const ctx = c.getContext('2d')!;
    const im = ctx.createImageData(COL_W, u.H);
    const d = im.data;
    const [ir, ig, ib] = INK_RGB;
    const off = u.H - OVERLAP;
    for (let x = 0; x < COL_W; x++) {
      const a = top[x], b = off + bot[x];
      for (let y = 0; y < u.H; y++) {
        const i = y * COL_W + x;
        const v = f[i];
        if (v < 0.02) continue;
        const wt = Math.min(1, Math.max(0, (y - a) / FEATHER + 1)) * Math.min(1, Math.max(0, (b - y) / FEATHER + 1));
        if (wt <= 0) continue;
        const p = i * 4;
        d[p] = ir; d[p + 1] = ig; d[p + 2] = ib;
        d[p + 3] = Math.round(255 * Math.min(1, v * 1.05) * wt);
      }
    }
    ctx.putImageData(im, 0, 0);
    const t = { canvas: c, born: now };
    this.tiles.set(k, t);
    return t;
  }

  // Which unit owns world point (x in column coords, y in world)
  unitAt(x: number, y: number, kLo: number, kHi: number): number | null {
    const xi = Math.max(0, Math.min(COL_W - 1, Math.round(x)));
    for (let k = kLo; k <= kHi; k++) {
      const u = this.units.get(k);
      if (!u) continue;
      const ly = y - this.y0.get(k)!;
      if (ly < 0 || ly >= u.H) continue;
      const top = this.seams.get(k), bot = this.seams.get(k - 1);
      if (!top || !bot) continue;
      if (ly >= top[xi] && ly < u.H - OVERLAP + bot[xi]) return k;
    }
    return null;
  }

  // Re-carve unit k: same slot and height, new source; pick the candidate
  // that stitches best to both fixed neighbours.
  reroll(k: number, now: number) {
    this.ensure(k + 1);
    this.ensure(k - 1);
    const old = this.units.get(k)!;
    const roll = (this.rolls.get(k) ?? 0) + 1;
    this.rolls.set(k, roll);
    const r = this.rand(k, roll);
    const above = this.bottomBand(k + 1), below = this.topBand(k - 1);
    let best: Unit | null = null, bestCost = Infinity;
    for (let c = 0; c < CANDIDATES; c++) {
      const u = this.makeUnit(k, old.kind, old.H, r);
      const cost = this.seam(above, this.renderInk(u, 0, OVERLAP), false).cost
        + this.seam(this.renderInk(u, u.H - OVERLAP, u.H), below, false).cost;
      if (cost < bestCost) { bestCost = cost; best = u; }
    }
    this.units.set(k, best!);
    this.inks.delete(k);
    this.seams.set(k, this.seam(above, this.topBand(k), true).path!);
    this.seams.set(k - 1, this.seam(this.bottomBand(k), below, true).path!);
    for (const j of [k - 1, k, k + 1]) {
      const t = this.tiles.get(j);
      if (t) this.fading.push({ k: j, canvas: t.canvas, born: now });
      this.tiles.delete(j);
    }
  }

  // Drop pixel caches far from the view (params and seams are tiny, kept)
  trim(kLo: number, kHi: number) {
    for (const k of this.tiles.keys()) if (k < kLo - 3 || k > kHi + 3) this.tiles.delete(k);
    for (const k of this.inks.keys()) if (k < kLo - 3 || k > kHi + 3) this.inks.delete(k);
  }

  // Index range of units overlapping world rows [top, bottom]
  range(top: number, bottom: number): [number, number] {
    let k = 0;
    // walk from a known index toward the view
    k = Math.max(this.lo, Math.min(this.hi, this.cursor));
    this.ensure(k);
    while (this.y0.get(k)! > bottom) { k++; this.ensure(k); }
    while (this.y0.get(k)! + this.units.get(k)!.H < bottom) { k--; this.ensure(k); }
    const kLo = k;
    while (this.y0.get(k)! > top) { k++; this.ensure(k); }
    this.cursor = kLo;
    return [kLo, k];
  }
  private cursor = 0;
}
