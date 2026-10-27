// Heightfield modes (blind emboss, black lacquer). One full-screen-ish plane;
// the fragment shader rebuilds the sheet of paper + table as a heightfield,
// derives normals by finite differences and ray-marches soft self-shadows
// toward a point light that follows the cursor.
import * as THREE from 'three';
import { boxBlur, type InkMap } from '../../lib/ink';

export const MARGIN = 90; // paper margin around the drawing (texels = scene units)

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const blur2 = (f: Float32Array, w: number, h: number, r: number) => boxBlur(boxBlur(f, w, h, r), w, h, r);

// Packs per-texel data into a half-float RGBA texture covering the whole sheet:
//   R emboss height · G lacquer height · B lacquer coverage · A oil halo
export function buildHeightTexture({ w, h, ink }: InkMap) {
  const SW = w + MARGIN * 2, SH = h + MARGIN * 2, N = SW * SH;
  const pad = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pad[(y + MARGIN) * SW + x + MARGIN] = ink[y * w + x];

  // Blind emboss (intaglio): lines push the paper up, the plate sinks a shallow
  // rectangle around the image — the plate mark every real print carries.
  const b1 = boxBlur(pad, SW, SH, 1);
  const b4 = blur2(pad, SW, SH, 3);
  const plate = new Float32Array(N);
  const P = 26;
  for (let y = MARGIN - P; y < MARGIN + h + P; y++)
    for (let x = MARGIN - P; x < MARGIN + w + P; x++) plate[y * SW + x] = 1;
  const plateSoft = blur2(plate, SW, SH, 2);

  // Black lacquer: thresholded strokes become a thick, self-levelling skin with
  // a rounded meniscus at the edge and pooling where strokes are dense.
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) m[i] = smooth(0.16, 0.5, b1[i]);
  const mb = blur2(m, SW, SH, 2);
  const pool = blur2(m, SW, SH, 8);
  const halo = blur2(m, SW, SH, 7);

  const data = new Uint16Array(N * 4);
  const half = THREE.DataUtils.toHalfFloat;
  for (let y = 0; y < SH; y++) {
    const row = (SH - 1 - y) * SW; // DataTexture row 0 = bottom
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x, o = (row + x) * 4;
      // paper cockle: never perfectly flat (baked here so the shadow march stays one fetch per step)
      const ck = 1.2 + 0.7 * Math.sin(x * 0.011 + 1.3) * Math.sin(y * 0.008 + 0.4) + 0.5 * Math.sin((x + y) * 0.006 + 2.0);
      const emb = ck + 2.4 * Math.pow(0.55 * b1[i] + 0.45 * b4[i], 0.85) - 0.9 * plateSoft[i];
      const cover = smooth(0.03, 0.3, mb[i]);
      const lac = ck + cover * (2.2 * Math.sqrt(mb[i]) + 3.2 * pool[i]);
      data[o] = half(emb);
      data[o + 1] = half(lac);
      data[o + 2] = half(cover);
      data[o + 3] = half(halo[i]);
    }
  }
  const tex = new THREE.DataTexture(data, SW, SH, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { tex, SW, SH };
}

const vertexShader = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uHeight;
  uniform vec2 uSheet;
  uniform float uMode;      // 0 emboss, 1 lacquer
  uniform vec3 uLight;
  uniform float uPower;
  uniform float uTime;
  varying vec2 vP;

  const float THICK = 1.4;  // paper thickness above the table
  const float MAXH = 11.0;  // highest point anywhere (ray-march exit)
  const float PI = 3.14159265;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

  float sheetMask(vec2 p) {
    vec2 d = abs(p) - uSheet * 0.5;
    float e = max(d.x, d.y) + (vnoise(p * 0.07) - 0.5) * 2.2;   // soft deckle
    return 1.0 - smoothstep(-0.7, 0.7, e);
  }
  vec4 tex(vec2 p) { return texture2D(uHeight, p / uSheet + 0.5); }
  float relief(vec4 t) { return mix(t.r, t.g, uMode); }

  // coarse height for the shadow march: one fetch, no noise
  float Hs(vec2 p) {
    vec2 d = abs(p) - uSheet * 0.5;
    return (1.0 - smoothstep(-0.7, 0.7, max(d.x, d.y))) * (THICK + relief(tex(p)));
  }
  // detailed height: adds paper tooth and brush ridges in the lacquer
  float Hd(vec2 p) {
    vec4 t = tex(p);
    float m = sheetMask(p);
    float tooth = fbm(p * 0.42) * 0.55 + vnoise(p * 1.6) * 0.12;
    float ridge = (vnoise(p * vec2(0.07, 0.24) + 9.0) - 0.5) * 1.1 * t.b * uMode;
    float toothAmt = mix(1.0, 1.0 - t.b, uMode);               // lacquer fills the tooth
    float table = (fbm(p * 0.05) * 0.6 + vnoise(p * 0.9) * 0.08) * (1.0 - m);
    return m * (THICK + relief(t) + tooth * toothAmt + ridge) + table;
  }

  float shadow(vec3 P, vec3 L) {
    vec3 d = L - P; float dist = length(d); d /= dist;
    float res = 1.0, t = 0.5;
    for (int i = 0; i < 44; i++) {
      vec3 q = P + d * t;
      if (q.z > MAXH || t > dist) break;
      float h = Hs(q.xy);
      res = min(res, 7.0 * (q.z - h) / t);
      if (res < 0.0) break;
      t += clamp(t * 0.11, 0.35, 9.0);
    }
    return smoothstep(0.0, 1.0, clamp(res, 0.0, 1.0));
  }

  float ggx(vec3 n, vec3 h, float rough) {
    float a = rough * rough, a2 = a * a, nh = max(dot(n, h), 0.0);
    float k = nh * nh * (a2 - 1.0) + 1.0;
    return a2 / (PI * k * k);
  }

  // studio around the object: one rectangular softbox up and to the left, a dim strip opposite
  vec3 studio(vec3 R) {
    vec3 S = normalize(vec3(-0.45, 0.7, 0.55));
    vec3 T = normalize(cross(S, vec3(0, 0, 1))), B = cross(T, S);
    float u = dot(R, T), v = dot(R, B), f = step(0.0, dot(R, S));
    float box = f * (1.0 - smoothstep(0.3, 0.42, abs(u))) * (1.0 - smoothstep(0.16, 0.24, abs(v)));
    vec3 S2 = normalize(vec3(0.7, -0.4, 0.6));
    float strip = smoothstep(0.96, 0.995, dot(R, S2));
    return vec3(1.0, 0.97, 0.92) * (box * 6.0 + strip * 1.5) + vec3(0.02, 0.022, 0.025) * (0.4 + R.z);
  }

  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

  void main() {
    vec2 p = vP;
    vec4 t = tex(p);
    float sheet = sheetMask(p);
    vec3 P = vec3(p, Hs(p));

    float e = 0.6;
    vec3 n = normalize(vec3(-(Hd(p + vec2(e, 0)) - Hd(p - vec2(e, 0))) / (2.0 * e),
                            -(Hd(p + vec2(0, e)) - Hd(p - vec2(0, e))) / (2.0 * e), 1.0));

    vec3 V = normalize(cameraPosition - P);
    vec3 Lv = uLight - P; float ld = length(Lv); vec3 L = Lv / ld;
    float att = uPower / (1.0 + pow(ld / 380.0, 2.0));
    float ndl = max(dot(n, L), 0.0);
    float sh = ndl > 0.0 ? shadow(P, uLight) : 0.0;
    vec3 lightCol = vec3(1.0, 0.93, 0.84) * att * sh;

    // ---- albedo / roughness ----
    float fiber = fbm(p * 0.35);
    vec3 paper = vec3(0.86, 0.84, 0.79) * (0.93 + 0.1 * fiber);
    float lac = t.b * uMode * sheet;
    // linseed halo bleeding into the paper around the lacquer
    paper *= mix(vec3(1.0), vec3(0.93, 0.89, 0.8), clamp(t.a * 1.6, 0.0, 1.0) * uMode * (1.0 - t.b));
    vec3 table = vec3(0.045, 0.042, 0.04) * (0.7 + 0.6 * fbm(p * 0.02));
    vec3 albedo = mix(table, paper, sheet);
    albedo = mix(albedo, vec3(0.012, 0.011, 0.01), lac);
    float rough = mix(mix(0.6, 0.85, sheet), 0.1, lac);
    float F0 = mix(0.03, 0.05, lac);

    // ---- key light ----
    vec3 H = normalize(L + V);
    float F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
    float spec = ggx(n, H, rough) * F / (4.0 * max(dot(L, H) * dot(L, H), 0.05));
    vec3 col = (albedo * (1.0 - F) / PI * 3.14 + spec) * ndl * lightCol;

    // ---- fill: dim skylight + studio reflections ----
    vec3 fillDir = normalize(vec3(-0.3, 0.6, 0.75));
    float fill = 0.035 + 0.05 * max(dot(n, fillDir), 0.0);
    col += albedo * fill;
    vec3 R = reflect(-V, n);
    float Fv = F0 + (1.0 - F0) * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    col += studio(R) * Fv * mix(0.08, 1.0, lac);

    // ---- photographic finish ----
    vec2 q = gl_FragCoord.xy;
    col *= 1.6;
    col = aces(col);
    col = pow(col, vec3(1.0 / 2.2));
    col += (hash(q + fract(uTime) * 91.0) - 0.5) * 0.025;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createReliefMaterial(tex: THREE.Texture, SW: number, SH: number) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uHeight: { value: tex },
      uSheet: { value: new THREE.Vector2(SW, SH) },
      uMode: { value: 0 },
      uLight: { value: new THREE.Vector3(-300, 400, 80) },
      uPower: { value: 3 },
      uTime: { value: 0 },
    },
  });
}
