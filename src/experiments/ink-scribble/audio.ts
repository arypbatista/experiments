// Small WebAudio kit for the thread modes: Karplus-Strong plucks, scissor snips,
// and two looping noise beds (yarn friction, wind) whose level the sim drives.

export class ThreadAudio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private wet!: GainNode;
  private noise!: AudioBuffer;
  private strings = new Map<number, AudioBuffer>();
  private voices = 0;
  private lastNote = 0;
  private zipGain!: GainNode;
  private zipFilter!: BiquadFilterNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  muted = false;

  // must be called from a user gesture
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = new AudioContext();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(comp);

    // cheap generated reverb
    const len = ctx.sampleRate * 2.4;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.wet.connect(conv);
    conv.connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // looping beds
    const bed = (type: BiquadFilterType, f: number, q: number) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = type; filt.frequency.value = f; filt.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(filt).connect(g).connect(this.master);
      src.start();
      return { filt, g };
    };
    const zip = bed('bandpass', 1400, 3);
    this.zipFilter = zip.filt; this.zipGain = zip.g;
    const wind = bed('lowpass', 500, 0.7);
    this.windFilter = wind.filt; this.windGain = wind.g;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  private out(pan: number) {
    const ctx = this.ctx!;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.master);
    p.connect(this.wet);
    return p;
  }

  // Karplus-Strong: a noise burst circulating through a lowpassed delay line
  private stringBuffer(freq: number) {
    const key = Math.round(freq * 10);
    let buf = this.strings.get(key);
    if (buf) return buf;
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const dur = Math.min(4, 1.2 + 260 / freq);
    buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
    const d = buf.getChannelData(0);
    const period = sr / freq;
    const N = Math.max(2, Math.floor(period));
    const frac = period - N;
    const line = new Float32Array(N + 2);
    for (let i = 0; i < line.length; i++) line[i] = Math.random() * 2 - 1;
    // soften the excitation a little
    for (let i = 1; i < line.length; i++) line[i] = line[i] * 0.6 + line[i - 1] * 0.4;
    const decay = 0.996 + Math.min(0.0035, freq / 200000);
    let idx = 0, prev = 0;
    for (let i = 0; i < d.length; i++) {
      const a = line[idx], b = line[(idx + 1) % line.length];
      const v = a + (b - a) * frac;
      d[i] = v;
      const nv = (v + prev) * 0.5 * decay;
      prev = v;
      line[idx] = nv;
      idx = (idx + 1) % N;
    }
    // fade the tail
    const fade = Math.floor(sr * 0.2);
    for (let i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade;
    this.strings.set(key, buf);
    return buf;
  }

  pluck(freq: number, pan: number, vel: number) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.voices > 24 || now - this.lastNote < 0.012) return;
    this.lastNote = now;
    const src = this.ctx.createBufferSource();
    src.buffer = this.stringBuffer(freq);
    const g = this.ctx.createGain();
    g.gain.value = Math.min(1, vel) * 0.55;
    src.connect(g).connect(this.out(pan));
    this.voices++;
    src.onended = () => { this.voices--; };
    src.start();
  }

  snip(pan: number, bright = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, now = ctx.currentTime;
    if (this.voices > 24 || now - this.lastNote < 0.018) return;
    this.lastNote = now;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2600 + Math.random() * 2400 * bright;
    f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.9, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    src.connect(f).connect(g).connect(this.out(pan));
    this.voices++;
    src.onended = () => { this.voices--; };
    src.start(now, Math.random() * 1.5, 0.09);
  }

  // level 0..1 for the yarn-friction bed
  zip(level: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.zipGain.gain.setTargetAtTime(Math.min(0.5, level * 0.5), t, 0.04);
    this.zipFilter.frequency.setTargetAtTime(900 + level * 2200, t, 0.05);
  }

  wind(level: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(Math.min(0.6, level * 0.6), t, 0.12);
    this.windFilter.frequency.setTargetAtTime(300 + level * 1400, t, 0.12);
  }
}
