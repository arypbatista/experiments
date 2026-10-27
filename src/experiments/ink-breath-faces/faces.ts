// Hand-authored face/head regions in drawing pixel coords (ink.png is 569×1000, y down)
// and the per-face breathing model. Each face runs its own queue of breath phases.

export type Temper = 'calm' | 'quick' | 'holder' | 'sigher' | 'irregular';

export interface Face {
  name: string;
  cx: number; cy: number; rx: number; ry: number;
  period: number; // seconds per breath
  depth: number;  // fractional scale swell at a normal full inhale
  lift: number;   // drawing px risen at a normal full inhale
  temper: Temper;
}

export const FACES: Face[] = [
  { name: 'old skull',   cx: 115, cy: 260, rx: 65,  ry: 95,  period: 5.8, depth: 0.055, lift: 4, temper: 'calm' },
  { name: 'brow',        cx: 235, cy: 205, rx: 75,  ry: 110, period: 4.6, depth: 0.05,  lift: 5, temper: 'sigher' },
  { name: 'peak',        cx: 405, cy: 165, rx: 75,  ry: 105, period: 3.9, depth: 0.045, lift: 4, temper: 'irregular' },
  { name: 'listener',    cx: 450, cy: 345, rx: 60,  ry: 85,  period: 2.1, depth: 0.028, lift: 2, temper: 'quick' },
  { name: 'shadow',      cx: 255, cy: 410, rx: 60,  ry: 90,  period: 6.4, depth: 0.06,  lift: 3, temper: 'calm' },
  { name: 'profile',     cx: 110, cy: 560, rx: 80,  ry: 115, period: 4.2, depth: 0.05,  lift: 5, temper: 'holder' },
  { name: 'little one',  cx: 235, cy: 620, rx: 65,  ry: 100, period: 1.7, depth: 0.025, lift: 2, temper: 'quick' },
  { name: 'big face',    cx: 380, cy: 610, rx: 105, ry: 145, period: 7.2, depth: 0.045, lift: 6, temper: 'calm' },
  { name: 'edge',        cx: 505, cy: 620, rx: 45,  ry: 110, period: 3.3, depth: 0.04,  lift: 3, temper: 'irregular' },
  { name: 'jaw',         cx: 130, cy: 825, rx: 85,  ry: 110, period: 5.1, depth: 0.05,  lift: 4, temper: 'sigher' },
  { name: 'sleeper',     cx: 295, cy: 860, rx: 90,  ry: 95,  period: 8.0, depth: 0.05,  lift: 3, temper: 'calm' },
  { name: 'beak',        cx: 475, cy: 835, rx: 65,  ry: 95,  period: 2.6, depth: 0.032, lift: 3, temper: 'quick' },
  { name: 'hidden',      cx: 345, cy: 335, rx: 50,  ry: 70,  period: 4.9, depth: 0.05,  lift: 3, temper: 'holder' },
];

type Kind = 'in' | 'hold' | 'out' | 'rest';
interface Phase { kind: Kind; dur: number; to: number }

// inhale: symmetric ease; exhale: front-loaded (air leaves fast, then trails off)
const easeIn = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const easeOut = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.pow(x, 0.62));

export class Breather {
  level = 0;      // 0 = empty, 1 = normal full inhale, >1 = deep (sigh)
  state: Kind | 'held' = 'rest';
  hovered = false;
  private queue: Phase[] = [];
  private cur: Phase | null = null;
  private t = 0;
  private from = 0;
  private cycles = 0;
  private nextSpecial: number;
  private heldT = 0;
  face: Face;
  private rand: () => number;

  constructor(face: Face, rand: () => number) {
    this.face = face;
    this.rand = rand;
    this.nextSpecial = 2 + Math.floor(rand() * 3);
    // desynchronise: start somewhere random in a breath
    this.t = 0;
    this.level = rand() * 0.6;
    this.push({ kind: 'out', dur: face.period * 0.4 * rand() + 0.2, to: 0 });
  }

  private push(...p: Phase[]) { this.queue.push(...p); }

  private jit(amount: number) { return 1 + (this.rand() * 2 - 1) * amount; }

  private scheduleBreath() {
    const f = this.face;
    const irregular = f.temper === 'irregular';
    const T = f.period * this.jit(irregular ? 0.35 : 0.08);
    const peak = this.jit(irregular ? 0.3 : 0.1);
    this.cycles++;
    const special = this.cycles >= this.nextSpecial;
    if (special) this.nextSpecial = this.cycles + 3 + Math.floor(this.rand() * 4);

    if (special && f.temper === 'sigher') {
      // sigh: inhale, catch, inhale deeper, then a long slow release
      this.push(
        { kind: 'in', dur: T * 0.35, to: 1.05 },
        { kind: 'hold', dur: 0.18, to: 1.05 },
        { kind: 'in', dur: T * 0.3, to: 1.75 },
        { kind: 'hold', dur: 0.35, to: 1.75 },
        { kind: 'out', dur: T * 1.25, to: 0 },
        { kind: 'rest', dur: T * 0.35, to: 0 },
      );
    } else if (special && f.temper === 'holder') {
      // deep inhale, holds it with a strained tremble, then lets it all out
      this.push(
        { kind: 'in', dur: T * 0.5, to: 1.3 },
        { kind: 'hold', dur: 2.2 + this.rand() * 2.2, to: 1.3 },
        { kind: 'out', dur: T * 0.55, to: 0 },
        { kind: 'rest', dur: T * 0.3, to: 0 },
      );
    } else {
      this.push(
        { kind: 'in', dur: T * 0.38, to: peak },
        { kind: 'out', dur: T * 0.47, to: 0 },
        { kind: 'rest', dur: T * (irregular ? 0.15 + this.rand() * 0.3 : 0.15), to: 0 },
      );
    }
  }

  setHovered(h: boolean) {
    if (h === this.hovered) return;
    this.hovered = h;
    const T = this.face.period;
    if (h) {
      // stop whatever it was doing and draw a breath to hold
      this.queue = [];
      this.cur = null;
      this.push({ kind: 'in', dur: Math.max(0.5, T * 0.35 * (1.3 - this.level)), to: 1.35 });
    } else if (this.state === 'held' || this.cur?.kind === 'in') {
      // release: a big relieved exhale, then a couple of recovery breaths
      this.queue = [];
      this.cur = null;
      this.push(
        { kind: 'out', dur: Math.max(1.2, T * 0.7), to: 0 },
        { kind: 'rest', dur: 0.15, to: 0 },
        { kind: 'in', dur: T * 0.3, to: 1.1 },
        { kind: 'out', dur: T * 0.4, to: 0 },
      );
    }
  }

  update(dt: number) {
    if (!this.cur) {
      if (!this.queue.length) {
        if (this.hovered) {
          // reached the top while hovered: hold indefinitely, the strain slowly building
          if (this.state !== 'held') this.heldT = 0;
          this.state = 'held';
          this.heldT += dt;
          const strain = Math.min(1, this.heldT / 4);
          this.level = 1.35 + 0.05 * strain + (0.008 + 0.022 * strain) * Math.sin(this.heldT * 21 + this.face.cx) * Math.min(1, this.heldT);
          return;
        }
        this.scheduleBreath();
      }
      this.cur = this.queue.shift()!;
      this.from = this.level;
      this.t = 0;
    }
    const p = this.cur;
    this.state = p.kind;
    this.t += dt;
    const x = Math.min(1, this.t / p.dur);
    if (p.kind === 'hold') {
      // straining tremble that grows the longer the breath is held
      this.level = p.to + 0.02 * Math.sin(this.t * 19 + this.face.cy) * Math.min(1, this.t);
    } else if (p.kind === 'rest') {
      this.level = this.from * (1 - x);
    } else {
      const e = p.kind === 'in' ? easeIn(x) : easeOut(x);
      this.level = this.from + (p.to - this.from) * e;
    }
    if (x >= 1) this.cur = null;
  }
}
