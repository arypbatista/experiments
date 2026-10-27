// Falling stones: few, heavy rigid bodies that strike the ink-rock hard.
// They live in grid units (same space as the erosion grid) and talk to the
// world through the small `StoneWorld` interface so the sim stays in index.astro.

export const AIR = 0, ROCK = 1, SED = 2;

const GRAVITY = 0.3;        // cells/frame²
const RESTITUTION = 0.2;    // bounciness
const FRICTION = 0.9;       // velocity kept after a contact
const CRATER_MIN_SPEED = 1.6;
const PUNCH_SPEED = 4.5;     // impacts above this can plough on through
const REST_FRAMES = 110;    // frames resting before a stone crumbles into the pile
const VERTS = 15;

export interface StoneWorld {
  gw: number; gh: number;
  cell: Uint8Array; tone: Uint8Array; hp: Uint8Array; support: Uint8Array;
  wind: () => number;
  viewX0: () => number; viewX1: () => number;
  spray: (x: number, y: number, vx: number, vy: number, kind: number, tone?: number) => void;
  removeRock: (c: number) => void; // marks rock dirty, clears support/hp
  shake: (amount: number) => void;
}

export interface Stone {
  x: number; y: number; vx: number; vy: number;
  a: number; spin: number; r: number;
  shape: Float32Array; hatch: number; tone: number;
  still: number;
}

export function makeStone(x: number, y: number, r: number, vx = 0, vy = 0): Stone {
  const shape = new Float32Array(VERTS);
  // lumpy outline: a couple of low harmonics plus jitter
  const p1 = Math.random() * 6.28, p2 = Math.random() * 6.28;
  for (let i = 0; i < VERTS; i++) {
    const t = (i / VERTS) * Math.PI * 2;
    shape[i] = 0.86 + 0.1 * Math.sin(2 * t + p1) + 0.07 * Math.sin(3 * t + p2) + (Math.random() - 0.5) * 0.12;
  }
  return {
    x, y, vx, vy, a: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.2, r,
    shape, hatch: Math.random() * Math.PI, tone: 6 + Math.random() * 20, still: 0,
  };
}

export function createStones(w: StoneWorld) {
  let stones: Stone[] = [];
  const { gw, gh, cell, tone, hp, support } = w;

  const solidAt = (x: number, y: number) => {
    const gx = Math.floor(x), gy = Math.floor(y);
    if (gx < 0 || gx >= gw) return false; // off the page: nothing to land on
    if (gy >= gh) return true;
    if (gy < 0) return false;
    return cell[gy * gw + gx] !== AIR;
  };

  // sample the disc perimeter (and an inner ring); returns the push-out normal
  function probe(x: number, y: number, r: number) {
    let nx = 0, ny = 0, hits = 0;
    for (let ring = 0; ring < 2; ring++) {
      const rr = ring ? r * 0.5 : r * 0.92;
      const n = ring ? 8 : 18;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const ox = Math.cos(t) * rr, oy = Math.sin(t) * rr;
        if (solidAt(x + ox, y + oy)) { nx -= ox; ny -= oy; hits++; }
      }
    }
    if (!hits) return null;
    const l = Math.hypot(nx, ny) || 1;
    return { nx: nx / l, ny: ny / l, hits };
  }

  function crater(cx: number, cy: number, r: number, speed: number) {
    const R = Math.min(26, r * 0.8 + Math.sqrt(r) * speed * 0.55);
    const R2 = R * R;
    let broke = 0;
    for (let yy = Math.floor(-R); yy <= R; yy++)
      for (let xx = Math.floor(-R); xx <= R; xx++) {
        const d2 = xx * xx + yy * yy;
        if (d2 > R2 * (0.75 + Math.random() * 0.4)) continue; // ragged rim
        const x = Math.round(cx + xx), y = Math.round(cy + yy);
        if (x < 1 || x >= gw - 1 || y < 0 || y >= gh) continue;
        const c = y * gw + x;
        const t = cell[c];
        if (t === AIR) continue;
        const d = Math.sqrt(d2) || 1;
        const out = speed * (0.25 + Math.random() * 0.45) * (1 - d / (R + 1) * 0.5);
        const fvx = (xx / d) * out + (Math.random() - 0.5), fvy = (yy / d) * out - out * 0.8;
        if (t === ROCK) {
          if (support[c] && hp[c] > 3) { hp[c] -= 3; continue; } // bedrock only chips
          const tn = 8 + Math.random() * 40;
          w.removeRock(c);
          broke++;
          const roll = Math.random();
          if (roll < 0.35) w.spray(x + 0.5, y + 0.5, fvx, fvy, 2, tn);       // flying chip
          else if (roll < 0.75) { cell[c] = SED; tone[c] = tn; }             // rubble in place
          else if (Math.random() < 0.3) w.spray(x, y, fvx * 0.6, fvy * 0.6, 1); // dust
        } else if (Math.random() < 0.45) {
          const tn = tone[c];
          cell[c] = AIR;
          w.spray(x + 0.5, y + 0.5, fvx * 0.8, fvy * 0.8, 2, tn);
        }
      }
    const puff = Math.min(60, 6 + broke * 0.3 + r * speed * 0.3);
    for (let i = 0; i < puff; i++)
      w.spray(cx, cy, (Math.random() - 0.5) * speed * 0.9, -Math.random() * speed * 0.7, 1);
    if (r > 5) w.shake(Math.min(10, r * speed * 0.06));
  }

  function crumble(s: Stone) {
    const R = s.r * 0.95;
    for (let yy = Math.floor(-R); yy <= R; yy++)
      for (let xx = Math.floor(-R); xx <= R; xx++) {
        if (xx * xx + yy * yy > R * R) continue;
        const x = Math.floor(s.x + xx), y = Math.floor(s.y + yy);
        if (x < 1 || x >= gw - 1 || y < 0 || y >= gh) continue;
        const c = y * gw + x;
        if (cell[c] === AIR) { cell[c] = SED; tone[c] = s.tone + Math.random() * 25; }
      }
    for (let i = 0; i < 8 + s.r; i++) w.spray(s.x, s.y, (Math.random() - 0.5) * 2, -Math.random() * 1.5, 1);
  }

  function step() {
    const keep: Stone[] = [];
    for (const s of stones) {
      s.vy = Math.min(s.vy + GRAVITY, 14);
      s.vx += (w.wind() * 0.4 - s.vx) * 0.002;

      // sediment poured onto a stone: shove it up and out
      const inside = probe(s.x, s.y, s.r);
      if (inside && inside.hits > 6) { s.x += inside.nx; s.y += inside.ny; }

      const speed = Math.hypot(s.vx, s.vy);
      const steps = Math.ceil(Math.max(speed, 1));
      let contact = false;
      for (let k = 0; k < steps; k++) {
        const nx = s.x + s.vx / steps, ny = s.y + s.vy / steps;
        const hit = probe(nx, ny, s.r);
        if (!hit) { s.x = nx; s.y = ny; continue; }
        contact = true;
        const vn = s.vx * hit.nx + s.vy * hit.ny;
        if (vn < 0) {
          const impact = -vn;
          if (impact > CRATER_MIN_SPEED) {
            crater(s.x - hit.nx * s.r, s.y - hit.ny * s.r, s.r, impact);
            // a hard hit can punch straight through what it just shattered
            if (impact > PUNCH_SPEED && !probe(nx, ny, s.r)) {
              s.x = nx; s.y = ny; s.vx *= 0.7; s.vy *= 0.7; contact = false;
              break;
            }
          }
          s.vx -= (1 + RESTITUTION) * vn * hit.nx;
          s.vy -= (1 + RESTITUTION) * vn * hit.ny;
          s.vx *= FRICTION; s.vy *= FRICTION;
        }
        // roll: spin follows tangential velocity
        const vt = s.vx * -hit.ny + s.vy * hit.nx;
        s.spin = s.spin * 0.6 + (vt / s.r) * 0.4;
        break;
      }
      s.a += s.spin;
      s.spin *= 0.995;

      if (contact && Math.hypot(s.vx, s.vy) < 0.6) s.still++;
      else s.still = Math.max(0, s.still - 2);
      if (s.still > REST_FRAMES) { crumble(s); continue; }
      if (s.y - s.r > gh || s.x < w.viewX0() - 40 || s.x > w.viewX1() + 40) continue;
      keep.push(s);
    }
    stones = keep;
  }

  function add(s: Stone) {
    if (stones.length < 120) stones.push(s);
  }

  function draw(ctx: CanvasRenderingContext2D, RX: number, RY: number, S: number, ink: string, paper: string) {
    for (const s of stones) {
      const cx = RX + s.x * S, cy = RY + s.y * S;
      ctx.beginPath();
      for (let i = 0; i <= VERTS; i++) {
        const k = i % VERTS;
        const t = s.a + (k / VERTS) * Math.PI * 2;
        const rr = s.r * s.shape[k] * S * 1.04;
        const x = cx + Math.cos(t) * rr, y = cy + Math.sin(t) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = ink;
      ctx.fill();
      if (s.r < 3.5) continue;
      // dry-brush hatching that spins with the stone
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = paper;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(0.8, S * 0.5);
      const R = s.r * S;
      const ang = s.a + s.hatch;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      ctx.beginPath();
      const lines = Math.max(2, Math.round(s.r / 2.5));
      for (let i = 0; i < lines; i++) {
        const off = (i / lines - 0.15) * R * 0.9;          // hatch on one side only: lit edge
        const ox = -dy * off, oy = dx * off;
        const len = R * (0.35 + 0.25 * Math.sin(i * 2.3 + s.hatch));
        ctx.moveTo(cx + ox - dx * len, cy + oy - dy * len);
        ctx.lineTo(cx + ox + dx * len, cy + oy + dy * len);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  return {
    step, add, draw,
    clear: () => { stones = []; },
    count: () => stones.length,
    free: (x: number, y: number, r: number) => !probe(x, y, r),
  };
}
