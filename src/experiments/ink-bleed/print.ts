// Turns a snapshot of the bath into a monoprint: mirrored (the sheet was laid
// face down), on a warmer paper, with uneven transfer where the sheet did not
// touch the water evenly, and a fine fiber grain.

import { PAPER_RGB } from '../../lib/ink';

export const PRINT_PAPER = '#f2eee4';
const PRINT_RGB = [242, 238, 228];
const SUMI_RGB = [24, 22, 24];

// smooth random field: a tiny grid of random values upscaled with bilinear smoothing
function field(w: number, h: number, cells: number, rand: () => number): Float32Array {
  const gw = Math.max(2, Math.round(cells)), gh = Math.max(2, Math.round((cells * h) / w));
  const g = document.createElement('canvas');
  g.width = gw; g.height = gh;
  const gctx = g.getContext('2d')!;
  const gd = gctx.createImageData(gw, gh);
  for (let i = 0; i < gw * gh; i++) {
    const v = rand() * 255;
    gd.data[i * 4] = gd.data[i * 4 + 1] = gd.data[i * 4 + 2] = v;
    gd.data[i * 4 + 3] = 255;
  }
  gctx.putImageData(gd, 0, 0);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(g, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = d[i * 4] / 255;
  return out;
}

export function makePrint(snap: HTMLCanvasElement, rand: () => number): HTMLCanvasElement {
  const w = snap.width, h = snap.height;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  // face down on the water, then turned over: a mirror image
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(snap, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const pressure = field(w, h, 5, rand);   // broad: where the sheet pressed harder
  const mottle = field(w, h, 60, rand);    // medium: sumi pooling
  const paperLum = (PAPER_RGB[0] + PAPER_RGB[1] + PAPER_RGB[2]) / 3;

  for (let i = 0, n = w * h; i < n; i++) {
    const lum = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
    let a = Math.min(1, Math.max(0, (paperLum - lum) / (paperLum - 20)));
    const take = 0.72 + 0.32 * pressure[i] + 0.22 * (mottle[i] - 0.5);
    a = Math.min(1, a * take);
    a = Math.pow(a, 0.92);
    const grain = (rand() - 0.5) * 7;
    for (let c = 0; c < 3; c++) {
      d[i * 4 + c] = PRINT_RGB[c] + (SUMI_RGB[c] - PRINT_RGB[c]) * a + grain;
    }
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
