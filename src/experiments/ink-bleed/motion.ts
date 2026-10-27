// The water's own life: autonomous motions that keep deforming the floating
// ink through the same exact, area-preserving pipeline as the user's gestures.
// Nothing here is scripted: every path and swirl is re-randomized when enabled.
//
//   current  one slow circulation of the whole bath
//   eddies   a few small vortices wandering across the drawing
//   breeze   wind shearing the surface in bands; its direction slowly turns
//   rain     drops land at random, using the selected drop type
//   needle   an invisible stylus wandering on a smooth random path
//
// The three continuous flows are summed into ONE stream function and applied
// in one GPU pass, and only once enough displacement (~0.6 px) has built up,
// so slow settings cost a pass every few frames and the masks are resampled
// as rarely as possible.

import type { Bath } from './bath';

export type MotionName = 'current' | 'eddies' | 'breeze' | 'rain' | 'needle';
export const MOTIONS: MotionName[] = ['current', 'eddies', 'breeze', 'rain', 'needle'];

const CURRENT_SPEED = 14;   // px/s peak at strength 1
const EDDY_SPEED = 45;
const EDDY_COUNT = 3;
const BREEZE_SPEED = 14;
const BREEZE_WAVE = 280;    // px between shear bands
const RAIN_PER_MIN = 14;    // drops per minute at strength 1
const RAIN_GROW_S = 0.6;    // a drop blooms over this long
const NEEDLE_SPEED = 160;   // px/s at strength 1
const NEEDLE_LAMBDA = 10;
const NEEDLE_STEP = 3;
const FLOW_MIN_PX = 0.6;    // accumulate flow until it moves this far
const FLOW_MAX_DT = 0.12;

type Box = { x: number; y: number; w: number; h: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// smooth, aperiodic-looking 1D wander in [-1, 1]
function wanderer() {
  const f = [rand(0.6, 1), rand(1.3, 2.1), rand(2.7, 3.9)];
  const ph = [rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)];
  return (t: number) =>
    (Math.sin(f[0] * t + ph[0]) * 0.55 + Math.sin(f[1] * t + ph[1]) * 0.3 + Math.sin(f[2] * t + ph[2]) * 0.15);
}

export function createMotion(bath: Bath, area: () => Box, view: () => { w: number; h: number }, nextDropInk: () => number) {
  const on: Record<MotionName, boolean> = { current: false, eddies: false, breeze: false, rain: false, needle: false };
  const strength: Record<MotionName, number> = { current: 0.3, eddies: 0.5, breeze: 0.5, rain: 0.5, needle: 0.5 };

  let t = 0;
  let flowAcc = 0;

  // per-motion random state, rebuilt whenever a motion is switched on
  let currentSign = 1;
  let eddies: { wx: (t: number) => number; wy: (t: number) => number; sign: number; r: number; pulse: (t: number) => number; rate: number }[] = [];
  let breeze = { theta: 0, turn: wanderer(), phase: 0 };
  let rainClock = 0;
  const raining: { x: number; y: number; r: number; target: number; ink: number }[] = [];
  let needle = { wx: wanderer(), wy: wanderer(), lift: wanderer(), s: 0, prev: null as null | { x: number; y: number } };

  function seed(name: MotionName) {
    if (name === 'current') currentSign = Math.random() < 0.5 ? -1 : 1;
    if (name === 'eddies') {
      eddies = Array.from({ length: EDDY_COUNT }, () => ({
        wx: wanderer(), wy: wanderer(), pulse: wanderer(),
        sign: Math.random() < 0.5 ? -1 : 1, r: rand(55, 110), rate: rand(0.025, 0.05),
      }));
    }
    if (name === 'breeze') breeze = { theta: rand(0, Math.PI * 2), turn: wanderer(), phase: rand(0, 6.28) };
    if (name === 'rain') rainClock = rand(0.3, 1.5);
    if (name === 'needle') needle = { wx: wanderer(), wy: wanderer(), lift: wanderer(), s: rand(0, 100), prev: null };
  }

  function flowStep(dt: number) {
    const V = view();
    const A = area();
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2;
    const current: [number, number, number, number] = on.current
      ? [V.w / 2, V.h / 2, currentSign * CURRENT_SPEED * strength.current, 0.42 * Math.min(V.w, V.h)]
      : [0, 0, 0, 0];
    const vortices: [number, number, number, number][] = on.eddies
      ? eddies.map((e) => [
          cx + e.wx(t * e.rate) * A.w * 0.45,
          cy + e.wy(t * e.rate + 40) * A.h * 0.42,
          e.sign * EDDY_SPEED * strength.eddies * (0.65 + 0.35 * e.pulse(t * 0.05)),
          e.r,
        ])
      : [];
    const theta = breeze.theta + 1.4 * breeze.turn(t * 0.02);
    const breezeP: [number, number, number, number] = on.breeze
      ? [-Math.sin(theta), Math.cos(theta), BREEZE_SPEED * strength.breeze, (Math.PI * 2) / BREEZE_WAVE]
      : [0, 0, 0, 0];
    bath.flow(dt, { current, vortices, breeze: breezeP, breezePhase: breeze.phase });
  }

  function maxFlowSpeed() {
    let s = 0;
    if (on.current) s += CURRENT_SPEED * strength.current;
    if (on.eddies) s += EDDY_SPEED * strength.eddies;
    if (on.breeze) s += BREEZE_SPEED * strength.breeze;
    return s;
  }

  function rainStep(dt: number) {
    if (on.rain && strength.rain > 0) {
      rainClock -= dt;
      if (rainClock <= 0) {
        const A = area();
        const target = rand(14, 52);
        raining.push({ x: rand(A.x - A.w * 0.1, A.x + A.w * 1.1), y: rand(A.y, A.y + A.h), r: 0, target, ink: nextDropInk() });
        // exponential gaps: a natural, irregular rhythm
        rainClock = -Math.log(1 - Math.random()) * (60 / (RAIN_PER_MIN * strength.rain));
      }
    }
    // drops already landing finish blooming even if rain is switched off
    for (let i = raining.length - 1; i >= 0; i--) {
      const d = raining[i];
      const rate = (Math.PI * d.target * d.target) / RAIN_GROW_S;
      const r2 = Math.min(d.target * d.target, d.r * d.r + (rate * dt) / Math.PI);
      const dr = Math.sqrt(Math.max(0, r2 - d.r * d.r));
      if (dr > 0) bath.drop(d.x, d.y, dr, d.ink);
      d.r = Math.sqrt(r2);
      if (d.r >= d.target - 1e-3) raining.splice(i, 1);
    }
  }

  function needleStep(dt: number) {
    if (!on.needle || strength.needle <= 0) { needle.prev = null; return; }
    const A = area();
    // advance along the path in path-length units so speed is roughly constant
    needle.s += (dt * NEEDLE_SPEED * strength.needle) / (0.5 * (A.w + A.h));
    const p = {
      x: A.x + A.w * (0.5 + 0.55 * needle.wx(needle.s * 2.2)),
      y: A.y + A.h * (0.5 + 0.5 * needle.wy(needle.s * 2.2 + 17)),
    };
    // the needle dips in and out of the water
    const inWater = needle.lift(needle.s * 0.9) > -0.25;
    if (needle.prev && inWater) {
      const dx = p.x - needle.prev.x, dy = p.y - needle.prev.y;
      const n = Math.min(40, Math.ceil(Math.hypot(dx, dy) / NEEDLE_STEP));
      for (let i = 0; i < n; i++) {
        bath.stroke(
          needle.prev.x + (dx * i) / n, needle.prev.y + (dy * i) / n,
          needle.prev.x + (dx * (i + 1)) / n, needle.prev.y + (dy * (i + 1)) / n,
          NEEDLE_LAMBDA, 1, 0,
        );
      }
    }
    needle.prev = p;
  }

  return {
    on, strength,
    set(name: MotionName, value: boolean) {
      if (value && !on[name]) seed(name);
      on[name] = value;
    },
    // dt in seconds; returns nothing, issues GPU passes
    step(dt: number) {
      t += dt;
      breeze.phase += dt * 0.25 * strength.breeze;
      const speed = maxFlowSpeed();
      if (speed > 0) {
        flowAcc += dt;
        if (flowAcc * speed >= FLOW_MIN_PX || flowAcc >= FLOW_MAX_DT) {
          flowStep(flowAcc);
          flowAcc = 0;
        }
      } else flowAcc = 0;
      rainStep(dt);
      needleStep(dt);
    },
    // forget pen positions after a pause so nothing jumps
    resume() { needle.prev = null; },
  };
}
