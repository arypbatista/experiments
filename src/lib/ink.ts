// Shared helpers for the ink-* experiments, all built from the same ink drawing
// (public/ink-figure/ink.png: cropped, lighting-flattened, black ink on white).

export const INK_URL = '/ink-figure/ink.png';
export const PAPER = '#ecebe6';
export const PAPER_RGB: [number, number, number] = [236, 235, 230];
export const INK_RGB: [number, number, number] = [20, 19, 18];

export interface InkMap {
  w: number;
  h: number;
  ink: Float32Array; // 0 = paper, 1 = full ink
  img: HTMLImageElement;
}

export function loadImage(src = INK_URL): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// scale resamples the drawing (0.5 = half resolution)
export async function loadInk(scale = 1): Promise<InkMap> {
  const img = await loadImage();
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const ink = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = 1 - d[i * 4] / 255;
  return { w, h, ink, img };
}

// Fit a w×h box centered inside W×H, filling `fill` of the limiting side
export function fitRect(w: number, h: number, W: number, H: number, fill = 0.86) {
  const s = Math.min((W * fill) / w, (H * fill) / h);
  return { s, x: (W - w * s) / 2, y: (H - h * s) / 2, w: w * s, h: h * s };
}

// Full-viewport 2D canvas with DPR handling; drawing happens in CSS pixels
export function fullCanvas(canvas: HTMLCanvasElement, onResize?: (W: number, H: number) => void) {
  const ctx = canvas.getContext('2d')!;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize?.(W, H);
  };
  window.addEventListener('resize', resize);
  resize();
  return ctx;
}

// Separable box blur on a scalar field
export function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[y * w + Math.min(w - 1, Math.max(0, x + k))];
      tmp[y * w + x] = s / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      out[y * w + x] = s / n;
    }
  }
  return out;
}

// Deterministic PRNG (mulberry32)
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
