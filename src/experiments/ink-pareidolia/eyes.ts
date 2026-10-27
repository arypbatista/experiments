// Hand-drawn ink eyes: brush-ribbon lids with variable width and dry-brush
// tails, a jittered ink blob for a pupil, scratchy hatching. Everything is
// driven by a per-eye seed plus a `boil` index so the contour is stable for a
// given frame of the cycle but "boils" like hand-drawn animation when the
// index advances.

export type Pt = [number, number];

function hash(i: number, seed: number) {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 0x165667b1, 0xc2b2ae35);
  x ^= x >>> 13;
  x = Math.imul(x, 0x27d4eb2f);
  x ^= x >>> 15;
  return ((x >>> 0) / 4294967296) * 2 - 1; // -1..1
}

// smooth 1D value noise, -1..1
export function noise1(t: number, seed: number) {
  const i = Math.floor(t), f = t - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Fill a brush ribbon along path f(t), t in [t0, t1]. Width w(t) is the full
// width; `offset` shifts the ribbon sideways in units of half-width (used for
// the individual bristles of a dry tail).
function ribbon(
  ctx: CanvasRenderingContext2D,
  f: (t: number) => Pt,
  t0: number,
  t1: number,
  w: (t: number) => number,
  seed: number,
  offset = 0,
) {
  if (t1 - t0 < 1e-3) return;
  const N = Math.max(6, Math.ceil((t1 - t0) * 28));
  const L: Pt[] = [], R: Pt[] = [];
  const eps = 1e-3;
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    const [x, y] = f(t);
    const a = f(t - eps), b = f(t + eps);
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    const nx = -ty, ny = tx;
    // pressure wobble: the brush swells and starves a little along the stroke
    const hw = (w(t) / 2) * (1 + 0.3 * noise1(t * 7, seed));
    const cx = x + nx * hw * offset, cy = y + ny * hw * offset;
    // the two edges wobble independently so the ribbon is never a clean offset
    const el = hw * (1 + 0.25 * noise1(t * 11, seed + 3));
    const er = hw * (1 + 0.25 * noise1(t * 11, seed + 7));
    // plus per-sample jag, so edges have the tooth of a brush on paper
    const jl = 1 + 0.22 * hash(i, seed + 13), jr = 1 + 0.22 * hash(i, seed + 17);
    L.push([cx + nx * el * jl, cy + ny * el * jl]);
    R.push([cx - nx * er * jr, cy - ny * er * jr]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fill();
}

// A brush stroke whose tail runs dry: solid body, then splits into bristles
// that give out at different lengths.
function stroke(
  ctx: CanvasRenderingContext2D,
  f: (t: number) => Pt,
  t0: number,
  t1: number,
  w: (t: number) => number,
  seed: number,
  dry = 0.3,
) {
  if (t1 <= t0) return;
  const span = t1 - t0;
  const tDry = t1 - span * dry;
  ribbon(ctx, f, t0, tDry, w, seed);
  if (dry <= 0) return;
  const B = 4;
  for (let k = 0; k < B; k++) {
    const end = tDry + span * dry * (0.45 + 0.55 * (0.5 + 0.5 * hash(k, seed + 31)));
    const off = (k / (B - 1)) * 2 - 1;
    ribbon(ctx, f, tDry - span * 0.04, Math.min(t1, end), (t) => w(t) * 0.3, seed + 11 * k, off * 0.75);
  }
}

// irregular blob: a circle with a noisy radius
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, rough = 0.14) {
  const N = 18;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = r * (1 + rough * noise1((i % N) * 0.9, seed) + rough * 0.5 * hash(i % N, seed + 5));
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export type PupilKind = 'pin' | 'dilated' | 'void' | 'slit';

export interface EyeState {
  x: number; // screen px
  y: number;
  r: number; // eye radius (screen px)
  tilt: number; // radians
  flip: boolean; // mirror so the heavy end of the lid sits on the nose side
  write: number; // 0..1 how much of the socket and closed lid has been drawn
  open: number; // 0..~1.3 lid opening (>1 = unnaturally wide)
  lookX: number; // pupil offset in units of r
  lookY: number;
  pupil: PupilKind;
  socket: number; // 0..1 how deep / dark the cross-hatched socket is
  seed: number;
  boil: number; // which frame of the boil cycle
}

// noisy closed outline (ellipse) as a clip path
function noisyEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number, rough = 0.12) {
  const N = 28;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 1 + rough * noise1(i * 0.7, seed) + rough * 0.6 * hash(i, seed + 3);
    const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// a field of parallel scratchy strokes, clipped by whatever clip is active.
// `amount` (0..1) reveals the strokes one by one in a scrambled order.
function hatch(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, extent: number,
  angle: number, spacing: number, width: number,
  amount: number, seed: number,
) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const n = Math.ceil((2 * extent) / spacing);
  for (let i = 0; i <= n; i++) {
    if ((hash(i, seed) * 0.5 + 0.5) > amount) continue;
    const o = -extent + i * spacing + spacing * 0.3 * hash(i, seed + 1);
    const bend = spacing * 0.8 * hash(i, seed + 2);
    const len = extent * (0.85 + 0.25 * hash(i, seed + 3));
    const ox = cx + nx * o, oy = cy + ny * o;
    ribbon(
      ctx,
      (t) => {
        const u = (t * 2 - 1) * len;
        const b = bend * Math.sin(Math.PI * t);
        return [ox + dx * u + nx * b, oy + dy * u + ny * b];
      },
      0, 1,
      (t) => width * (0.4 + 0.6 * Math.sin(Math.PI * t)),
      seed + 10 + i,
    );
  }
}

export function drawEye(ctx: CanvasRenderingContext2D, e: EyeState, ink: string, paper: string, alpha = 1) {
  if (e.write <= 0.001 || alpha <= 0.01) return;
  const { r } = e;
  const s = e.seed * 7919 + e.boil * 101;
  // per-eye proportions, fixed by seed (not boiled)
  const sh = (k: number) => hash(k, e.seed * 7919 + 13); // -1..1
  const a = r * (1.3 + 0.15 * sh(1)); // half width of the opening
  const hU = 0.85 + 0.15 * sh(2), hL = 0.6 + 0.12 * sh(3), skew = 0.2 * sh(4);
  const jit = (t: number, k: number) => noise1(t * 3.2 + e.boil * 5.7, s + k) * r * 0.08;
  const w = clamp01(e.write);

  const open = Math.max(0, e.open);
  const xOf = (t: number) => -a + 2 * a * t;
  const closedY = (t: number) => r * 0.22 * Math.sin(Math.PI * t);
  // lopsided lid: the peak drifts off-centre, the outer corner droops
  const upperOpenY = (t: number) =>
    -r * hU * Math.pow(Math.sin(Math.PI * Math.pow(clamp01(t), 1.1 + 0.3 * sh(6))), 0.7) + r * (0.15 + skew) * (t - 0.5);
  const lowerOpenY = (t: number) => r * hL * Math.pow(Math.sin(Math.PI * clamp01(t)), 1.1) + r * 0.1 * (t - 0.5);
  const upper = (t: number): Pt => [xOf(t) + jit(t, 1), lerp(closedY(t), upperOpenY(t), open) + jit(t, 2)];
  const lower = (t: number): Pt => [
    xOf(t) + jit(t, 3),
    lerp(closedY(t), lowerOpenY(t), Math.min(1.25, open * 1.3)) + jit(t, 4),
  ];

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(e.x, e.y);
  ctx.rotate(e.tilt);
  if (e.flip) ctx.scale(-1, 1);
  ctx.fillStyle = ink;

  // ---- sunken socket: hatched shadow pooled above the lid and under the
  // outer corner (not a ring), so the eye sits down in a hole
  if (e.socket > 0) {
    const sa = clamp01(w * 1.3) * e.socket;
    // brow shadow: long diagonal strokes over the upper lid
    ctx.save();
    noisyEllipse(ctx, r * 0.1, -r * 0.55, a * 1.02, r * 0.95, s + 500, 0.12);
    ctx.clip();
    hatch(ctx, r * 0.15, -r * 0.75, r * 2.2, -0.4 + 0.15 * sh(7), r * 0.26, r * 0.09, sa, e.seed * 31 + e.boil);
    hatch(ctx, r * 0.15, -r * 0.55, r * 1.6, 0.45 + 0.1 * sh(9), r * 0.3, r * 0.05, sa * 0.7, e.seed * 41 + e.boil);
    ctx.restore();
    // pouch under the outer corner, cross-hatched the other way
    ctx.save();
    noisyEllipse(ctx, a * 0.35, r * 0.75, a * 0.95, r * 0.55, s + 520, 0.2);
    ctx.clip();
    hatch(ctx, a * 0.35, r * 0.75, r * 1.5, 0.85 + 0.2 * sh(8), r * 0.24, r * 0.06, sa, e.seed * 37 + e.boil);
    ctx.restore();
    // fold of the socket above the lid: one dragging stroke
    ribbon(
      ctx,
      (t) => [lerp(-a * 0.9, a * 1.15, t), -r * (1.15 + 0.15 * sh(10)) * Math.sin(Math.PI * (0.15 + 0.7 * t)) + r * 0.2 * t],
      0, w,
      (t) => r * 0.13 * Math.pow(Math.sin(Math.PI * t), 0.6) * e.socket,
      s + 540,
    );
  }

  // ---- the opening: grimy paper, a dark mass, no catchlight
  if (open > 0.03) {
    ctx.beginPath();
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const p = upper(i / N);
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    for (let i = N; i >= 0; i--) {
      const p = lower(i / N);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = ink;

    const lx = (e.flip ? -e.lookX : e.lookX) * r;
    const ly = e.lookY * r;
    // dirty sclera: faint scratches across the white
    ctx.globalAlpha = alpha * 0.4;
    hatch(ctx, 0, 0, a, 0.5 + 0.3 * sh(12), r * 0.32, r * 0.04, 0.3, e.seed * 43 + e.boil);
    ctx.globalAlpha = alpha;
    // heavy shadow under the upper lid eats into the white
    ribbon(ctx, (t) => { const p = upper(t); return [p[0], p[1] + r * 0.12]; }, 0, 1,
      (t) => r * 0.28 * Math.pow(Math.sin(Math.PI * t), 0.6), s + 60);

    if (e.pupil === 'pin') {
      blob(ctx, lx, ly, r * 0.14, s + 17, 0.35);
    } else if (e.pupil === 'dilated') {
      blob(ctx, lx, ly, r * 0.66, s + 17, 0.2);
    } else if (e.pupil === 'void') {
      // nothing but dark: a sliver of white survives along the lower lid
      blob(ctx, lx * 0.5, ly * 0.5 - r * 0.25, r * 1.25, s + 17, 0.15);
    } else {
      // slit, like a goat's
      ribbon(ctx, (t) => [lx + r * 0.06 * Math.sin(t * 3), ly + (t * 2 - 1) * r * 0.85], 0, 1,
        (t) => r * 0.24 * Math.pow(Math.sin(Math.PI * t), 0.7), s + 18);
    }
    ctx.restore();
  }

  ctx.fillStyle = ink;
  // upper lid: one heavy, uneven brush stroke, barely dry at the tail
  const lidW = (t: number) =>
    r * (0.32 + 0.3 * Math.pow(1 - clamp01(t), 1.2)) * Math.pow(Math.sin(Math.PI * clamp01(t * 0.9 + 0.05)), 0.35);
  stroke(ctx, upper, -0.05, lerp(-0.05, 1.04, w), lidW, s + 100, 0.12);
  // lower lid: a second heavy, ragged stroke, the dark ring under the eye
  if (open > 0.05) {
    const lw = (t: number) => r * 0.13 * Math.pow(Math.sin(Math.PI * t), 0.5);
    ribbon(ctx, (t) => { const p = lower(t); return [p[0], p[1] + r * 0.04]; }, 0.1, lerp(0.1, 0.55, w), lw, s + 200);
    ribbon(ctx, (t) => { const p = lower(t); return [p[0], p[1] + r * 0.04]; }, 0.62, lerp(0.62, 0.95, w), lw, s + 201);
  }
  ctx.restore();
}
