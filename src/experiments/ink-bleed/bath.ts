// The marbling bath. Instead of advecting ink as a dye (which smears it a bit
// more on every step), the GPU keeps a *map* texture: for every point of the
// water surface it stores where that bit of floating ink came from in the
// original drawing. Each gesture is an exact, area-preserving deformation of
// the surface (Jaffer & Lu, "Mathematical Marbling"), applied as its inverse:
//   newMap(p) = oldMap(inverse(p))
// The map is a smooth function, so resampling it thousands of times keeps the
// ink lines as crisp as the source drawing.
//
// two textures travel together through every deformation:
// map texel = (srcX, srcY, film, sumi)
//   srcX, srcY  position in drawing space (CSS px, y up)
//   film        1 where the original floating drawing is, 0 inside drops
//   sumi        1 inside sumi (ink) drops
// amt texel = (amount, -, -, -)
//   amount      ink strength: 1 fresh, reduced each time a print lifts ink
// film/sumi are presence masks: the renderer re-sharpens them with fwidth so
// drop edges stay crisp however far they get stretched.

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// shared: manual bilinear lookup (float textures are not always filterable)
const MAP_LIB = `
uniform sampler2D uMap;
uniform sampler2D uAmt;
uniform float uSim;      // map texels per CSS px (of the map being read)
uniform float uOutSim;   // texels per CSS px of the target being written
uniform vec2 uView;      // viewport in CSS px
uniform vec2 uOffset;    // screen position of drawing-space origin

vec4 identity(vec2 p) { return vec4(p - uOffset, 1.0, 0.0); }

bool outside(vec2 p) { return p.x < 0.0 || p.y < 0.0 || p.x > uView.x || p.y > uView.y; }

vec4 bilerp(sampler2D tex, vec2 p) {
  ivec2 sz = textureSize(tex, 0);
  vec2 t = p * uSim - 0.5;
  vec2 f = fract(t);
  ivec2 i0 = ivec2(floor(t));
  ivec2 a = clamp(i0, ivec2(0), sz - 1);
  ivec2 b = clamp(i0 + 1, ivec2(0), sz - 1);
  vec4 v00 = texelFetch(tex, ivec2(a.x, a.y), 0);
  vec4 v10 = texelFetch(tex, ivec2(b.x, a.y), 0);
  vec4 v01 = texelFetch(tex, ivec2(a.x, b.y), 0);
  vec4 v11 = texelFetch(tex, ivec2(b.x, b.y), 0);
  return mix(mix(v00, v10, f.x), mix(v01, v11, f.x), f.y);
}

vec4 sampleMap(vec2 p) { return outside(p) ? identity(p) : bilerp(uMap, p); }
vec4 sampleAmt(vec2 p) { return outside(p) ? vec4(1.0, 0.0, 0.0, 0.0) : bilerp(uAmt, p); }
`;

const OP_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
${MAP_LIB}
uniform int uMode;       // 0 init, 1 stroke, 2 drop, 3 lift, 4 resize copy, 5 flow
uniform vec2 uA;
uniform vec2 uB;
uniform float uLambda;
uniform float uTines;
uniform float uGap;
uniform float uR;
uniform float uInk;
uniform float uKeep;
uniform vec2 uShift;     // resize: how far the old view moved
// flow: the water's own motion as one stream function ψ, so u = (∂ψ/∂y, −∂ψ/∂x)
// is divergence-free (area-preserving) whatever is combined into it
uniform float uDt;
uniform vec4 uCurrent;   // (cx, cy, peak speed px/s, radius)
uniform vec4 uVort[4];   // (x, y, peak speed px/s signed, radius)
uniform vec4 uBreeze;    // (nx, ny, speed px/s, wavenumber) — n is across the wind
uniform float uBreezePhase;
layout(location = 0) out vec4 outMap;
layout(location = 1) out vec4 outAmt;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return length(p - a - ab * h);
}

// displacement of a needle (or a comb of needles) dragged from A to B through
// viscous size: shear along the drag, decaying with distance to the tine path
vec2 strokeDisp(vec2 p) {
  vec2 d = uB - uA;
  float L = length(d);
  vec2 M = d / max(L, 1e-6);
  vec2 N = vec2(-M.y, M.x);
  float f = 0.0;
  for (int k = 0; k < 16; k++) {
    if (float(k) >= uTines) break;
    vec2 o = N * ((float(k) - (uTines - 1.0) * 0.5) * uGap);
    float dist = segDist(p, uA + o, uB + o);
    f = max(f, exp(-dist / uLambda));
  }
  return M * L * f;
}

// Gaussian swirl: ψ = S·R·e^{−r²/R²}/0.858 has peak tangential speed S
float swirl(vec2 p, vec4 v) {
  vec2 d = p - v.xy;
  return v.z * v.w * exp(-dot(d, d) / (v.w * v.w)) * 1.1658;
}

float psi(vec2 p) {
  float s = swirl(p, uCurrent);
  for (int i = 0; i < 4; i++) s += swirl(p, uVort[i]);
  // breeze: shear bands of wind, ψ = (S/k)·sin(k n·p + φ) flows along the wind
  s += uBreeze.z / uBreeze.w * sin(uBreeze.w * dot(uBreeze.xy, p) + uBreezePhase);
  return s;
}

vec2 flowVel(vec2 p) {
  const float h = 1.0;
  return vec2(psi(p + vec2(0.0, h)) - psi(p - vec2(0.0, h)),
              psi(p - vec2(h, 0.0)) - psi(p + vec2(h, 0.0))) / (2.0 * h);
}

void main() {
  vec2 p = gl_FragCoord.xy / uOutSim;
  if (uMode == 5) {
    // backtrace along the flow (midpoint fixed point), one resample per step
    vec2 q = p;
    for (int i = 0; i < 3; i++) q = p - uDt * flowVel(0.5 * (p + q));
    outMap = sampleMap(q);
    outAmt = sampleAmt(q);
    return;
  }
  if (uMode == 0) { outMap = identity(p); outAmt = vec4(1.0, 0.0, 0.0, 0.0); return; }
  if (uMode == 1) {
    // invert p = q + D(q) by fixed-point iteration
    vec2 q = p;
    for (int i = 0; i < 4; i++) q = p - strokeDisp(q);
    outMap = sampleMap(q);
    outAmt = sampleAmt(q);
    return;
  }
  if (uMode == 2) {
    // a drop of radius r at C pushes everything outward, preserving area:
    //   forward  p' = C + (p-C) sqrt(1 + r²/|p-C|²)
    //   inverse  p  = C + (p'-C) sqrt(1 - r²/|p'-C|²)
    vec2 v = p - uA;
    float d2 = dot(v, v);
    float r2 = uR * uR;
    if (d2 <= r2) {
      outMap = vec4(sampleMap(uA).xy, 0.0, uInk > 0.0 ? 1.0 : 0.0);
      outAmt = vec4(uInk > 0.0 ? uInk : 1.0, 0.0, 0.0, 0.0);
    } else {
      vec2 q = uA + v * sqrt(1.0 - r2 / d2);
      outMap = sampleMap(q);
      outAmt = sampleAmt(q);
    }
    return;
  }
  if (uMode == 3) {
    outMap = sampleMap(p);
    outAmt = sampleAmt(p) * uKeep;
    return;
  }
  // resize: old map shifted by uShift (the new offset is already set)
  vec2 q = p - uShift;
  if (q.x < 0.0 || q.y < 0.0 || q.x > uA.x || q.y > uA.y) {
    outMap = identity(p);
    outAmt = vec4(1.0, 0.0, 0.0, 0.0);
  } else {
    outMap = sampleMap(q);
    outAmt = sampleAmt(q);
  }
}`;

const RENDER_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
${MAP_LIB}
uniform sampler2D uInkTex;
uniform vec4 uRect;      // drawing rect in drawing space
uniform float uDpr;
uniform float uTime;
uniform vec3 uPaper;
uniform vec3 uInkCol;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  vec4 m = sampleMap(p);
  vec2 uv = (m.xy - uRect.xy) / uRect.zw;
  float src = 0.0;
  if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) {
    // fade the sheet border so the drawing's rectangle never shows as a seam
    vec2 e = min(uv, 1.0 - uv);
    // and drop the scan's faint paper noise, which stretching would turn into dust
    src = clamp((1.0 - texture(uInkTex, uv).r - 0.06) / 0.94, 0.0, 1.0) * smoothstep(0.0, 0.04, min(e.x, e.y));
  }
  float amt = sampleAmt(p).r;
  // re-sharpen the presence masks to a ~1 screen-pixel edge
  float wf = max(fwidth(m.z) * 0.7, 1e-4);
  float ws = max(fwidth(m.w) * 0.7, 1e-4);
  float film = smoothstep(0.5 - wf, 0.5 + wf, m.z);
  float sumi = smoothstep(0.5 - ws, 0.5 + ws, m.w);
  float dens = clamp((film * src + sumi) * amt, 0.0, 1.0);

  // floating sumi: thin films read as a cool grey, dense ones as black
  vec3 thin = mix(uPaper, vec3(0.42, 0.43, 0.45), 0.6);
  vec3 col = mix(uPaper, thin, smoothstep(0.0, 0.35, dens));
  col = mix(col, uInkCol, smoothstep(0.25, 1.0, dens));

  // the surface: a very slow, faint sheen so the paper-colored size reads as liquid
  float n = noise(p * 0.004 + vec2(uTime * 0.03, -uTime * 0.02))
          + 0.5 * noise(p * 0.011 - vec2(uTime * 0.05, uTime * 0.04));
  col += (n - 0.75) * 0.018;
  outColor = vec4(col, 1.0);
}`;

export interface FlowParams {
  current: [number, number, number, number];
  vortices: [number, number, number, number][]; // up to 4
  breeze: [number, number, number, number];
  breezePhase: number;
}

export interface Bath {
  flow(dt: number, f: FlowParams): void;
  stroke(ax: number, ay: number, bx: number, by: number, lambda: number, tines: number, gap: number): void;
  drop(x: number, y: number, r: number, ink: number): void;
  lift(keep: number): void;
  reset(): void;
  render(time: number): void;
  offset(): { x: number; y: number };
  capture(sx: number, sy: number, sw: number, sh: number): HTMLCanvasElement;
}

type Rect = { x: number; y: number; w: number; h: number };

export function createBath(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  rect: Rect,
  paper: [number, number, number],
  ink: [number, number, number],
): Bath | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return null;
  const hasF32 = !!gl.getExtension('EXT_color_buffer_float');
  const hasF16 = hasF32 || !!gl.getExtension('EXT_color_buffer_half_float');
  if (!hasF16) return null;
  const internal = hasF32 ? gl.RGBA32F : gl.RGBA16F;
  const texType = hasF32 ? gl.FLOAT : gl.HALF_FLOAT;

  function compile(type: number, src: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) || 'shader');
    return s;
  }
  function program(frag: string) {
    const p = gl!.createProgram()!;
    gl!.attachShader(p, compile(gl!.VERTEX_SHADER, VERT));
    gl!.attachShader(p, compile(gl!.FRAGMENT_SHADER, frag));
    gl!.bindAttribLocation(p, 0, 'aPos');
    gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(p) || 'link');
    // missing (optimized-out) uniforms resolve to null, which WebGL ignores
    const cache: Record<string, WebGLUniformLocation | null> = {};
    const u = new Proxy(cache, {
      get: (c, k: string) => (k in c ? c[k] : (c[k] = gl!.getUniformLocation(p, k))),
    });
    return { p, u };
  }

  const opProg = program(OP_FRAG);
  const renderProg = program(RENDER_FRAG);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // drawing texture (y flipped so uv y is up, like the map)
  const inkTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, inkTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D); // stretched-thin lines minify cleanly
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  type Target = { tex: WebGLTexture; amt: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
  function floatTex(w: number, h: number) {
    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, internal, w, h, 0, gl!.RGBA, texType, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return tex;
  }
  function target(w: number, h: number): Target {
    const tex = floatTex(w, h), amt = floatTex(w, h);
    const fbo = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT1, gl!.TEXTURE_2D, amt, 0);
    gl!.drawBuffers([gl!.COLOR_ATTACHMENT0, gl!.COLOR_ATTACHMENT1]);
    return { tex, amt, fbo, w, h };
  }
  function free(t: Target) { gl!.deleteTexture(t.tex); gl!.deleteTexture(t.amt); gl!.deleteFramebuffer(t.fbo); }

  // bind a target's two textures for reading on units 0 and 2
  function bindRead(t: Target, u: Record<string, WebGLUniformLocation | null>) {
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, t.tex);
    gl!.activeTexture(gl!.TEXTURE2);
    gl!.bindTexture(gl!.TEXTURE_2D, t.amt);
    gl!.uniform1i(u.uMap, 0);
    gl!.uniform1i(u.uAmt, 2);
  }

  let W = window.innerWidth, H = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let sim = 1;
  const off = { x: 0, y: 0 };
  let src: Target, dst: Target;

  function simScale(w: number, h: number) { return Math.min(1, 1600 / Math.max(w, h)); }

  // run one op pass from src into dst, then swap
  function pass(mode: number, set?: () => void) {
    gl!.useProgram(opProg.p);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, dst.fbo);
    gl!.viewport(0, 0, dst.w, dst.h);
    const u = opProg.u;
    bindRead(src, u);
    gl!.uniform1i(u.uMode, mode);
    gl!.uniform1f(u.uSim, sim);
    gl!.uniform1f(u.uOutSim, sim);
    gl!.uniform2f(u.uView, W, H);
    gl!.uniform2f(u.uOffset, off.x, off.y);
    set?.();
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    [src, dst] = [dst, src];
  }

  function allocate() {
    sim = simScale(W, H);
    const w = Math.max(1, Math.round(W * sim)), h = Math.max(1, Math.round(H * sim));
    src = target(w, h);
    dst = target(w, h);
  }

  function sizeCanvas() {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  sizeCanvas();
  allocate();
  pass(0);

  window.addEventListener('resize', () => {
    const oW = W, oH = H, oSim = sim;
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas();
    // keep the bath centered: shift everything by half the size change
    const shift = { x: (W - oW) / 2, y: (H - oH) / 2 };
    off.x += shift.x; off.y += shift.y;
    const old = src, oldDst = dst;
    allocate();
    // copy the old surface (read at the old scale) into the new targets
    gl!.useProgram(opProg.p);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, dst.fbo);
    gl!.viewport(0, 0, dst.w, dst.h);
    const u = opProg.u;
    bindRead(old, u);
    gl!.uniform1i(u.uMode, 4);
    gl!.uniform1f(u.uSim, oSim);
    gl!.uniform1f(u.uOutSim, sim);
    gl!.uniform2f(u.uView, oW, oH);
    gl!.uniform2f(u.uOffset, off.x, off.y);
    gl!.uniform2f(u.uA, oW, oH);
    gl!.uniform2f(u.uShift, shift.x, shift.y);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    [src, dst] = [dst, src];
    free(old);
    free(oldDst);
  });

  function render(time: number) {
    gl!.useProgram(renderProg.p);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    const u = renderProg.u;
    bindRead(src, u);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, inkTex);
    gl!.uniform1i(u.uInkTex, 1);
    gl!.uniform1f(u.uSim, sim);
    gl!.uniform2f(u.uView, W, H);
    gl!.uniform2f(u.uOffset, off.x, off.y);
    gl!.uniform4f(u.uRect, rect.x, rect.y, rect.w, rect.h);
    gl!.uniform1f(u.uDpr, canvas.width / W);
    gl!.uniform1f(u.uTime, time);
    gl!.uniform3f(u.uPaper, paper[0] / 255, paper[1] / 255, paper[2] / 255);
    gl!.uniform3f(u.uInkCol, ink[0] / 255, ink[1] / 255, ink[2] / 255);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  let lastTime = 0;

  const vort = new Float32Array(16);

  return {
    flow(dt, f) {
      vort.fill(0);
      f.vortices.slice(0, 4).forEach((v, i) => vort.set(v, i * 4));
      for (let i = 0; i < 4; i++) if (vort[i * 4 + 3] === 0) vort[i * 4 + 3] = 1;
      pass(5, () => {
        const u = opProg.u;
        gl!.uniform1f(u.uDt, dt);
        gl!.uniform4fv(u.uCurrent, f.current[3] ? f.current : [0, 0, 0, 1]);
        gl!.uniform4fv(u['uVort[0]'], vort);
        gl!.uniform4fv(u.uBreeze, f.breeze[3] ? f.breeze : [1, 0, 0, 1]);
        gl!.uniform1f(u.uBreezePhase, f.breezePhase);
      });
    },
    stroke(ax, ay, bx, by, lambda, tines, gap) {
      pass(1, () => {
        gl!.uniform2f(opProg.u.uA, ax, ay);
        gl!.uniform2f(opProg.u.uB, bx, by);
        gl!.uniform1f(opProg.u.uLambda, lambda);
        gl!.uniform1f(opProg.u.uTines, tines);
        gl!.uniform1f(opProg.u.uGap, gap);
      });
    },
    drop(x, y, r, inkAmt) {
      pass(2, () => {
        gl!.uniform2f(opProg.u.uA, x, y);
        gl!.uniform1f(opProg.u.uR, r);
        gl!.uniform1f(opProg.u.uInk, inkAmt);
      });
    },
    lift(keep) {
      pass(3, () => gl!.uniform1f(opProg.u.uKeep, keep));
    },
    reset() { pass(0); },
    render(time) { lastTime = time; render(time); },
    offset() { return { ...off }; },
    capture(sx, sy, sw, sh) {
      // the default framebuffer is only readable right after drawing to it
      render(lastTime);
      const k = canvas.width / W;
      const out = document.createElement('canvas');
      const scale = Math.min(k, 1100 / sh);
      out.width = Math.round(sw * scale);
      out.height = Math.round(sh * scale);
      out.getContext('2d')!.drawImage(canvas, sx * k, sy * k, sw * k, sh * k, 0, 0, out.width, out.height);
      return out;
    },
  };
}
