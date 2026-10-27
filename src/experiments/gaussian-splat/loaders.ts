import * as THREE from 'three';

// Common in-memory format: one entry per gaussian.
// covariances holds the upper triangle of the 3×3 covariance: xx, xy, xz, yy, yz, zz.
export interface SplatData {
  count: number;
  positions: Float32Array; // 3 per splat
  covariances: Float32Array; // 6 per splat
  colors: Uint8Array; // rgba, sRGB, 4 per splat
  yDown: boolean; // 3DGS captures use OpenCV axes (y down) and need a flip
}

const SH_C0 = 0.28209479177387814;

function alloc(count: number, yDown: boolean): SplatData {
  return {
    count,
    positions: new Float32Array(count * 3),
    covariances: new Float32Array(count * 6),
    colors: new Uint8Array(count * 4),
    yDown,
  };
}

// Σ = R S Sᵀ Rᵀ from per-axis scale and unit quaternion (w, x, y, z)
function writeScaleRot(
  d: SplatData, i: number,
  sx: number, sy: number, sz: number,
  qw: number, qx: number, qy: number, qz: number,
) {
  const ql = Math.hypot(qw, qx, qy, qz) || 1;
  qw /= ql; qx /= ql; qy /= ql; qz /= ql;
  const r00 = 1 - 2 * (qy * qy + qz * qz), r01 = 2 * (qx * qy - qw * qz), r02 = 2 * (qx * qz + qw * qy);
  const r10 = 2 * (qx * qy + qw * qz), r11 = 1 - 2 * (qx * qx + qz * qz), r12 = 2 * (qy * qz - qw * qx);
  const r20 = 2 * (qx * qz - qw * qy), r21 = 2 * (qy * qz + qw * qx), r22 = 1 - 2 * (qx * qx + qy * qy);
  // M = R·S
  const m00 = r00 * sx, m01 = r01 * sy, m02 = r02 * sz;
  const m10 = r10 * sx, m11 = r11 * sy, m12 = r12 * sz;
  const m20 = r20 * sx, m21 = r21 * sy, m22 = r22 * sz;
  const c = d.covariances, o = i * 6;
  c[o] = m00 * m00 + m01 * m01 + m02 * m02;
  c[o + 1] = m00 * m10 + m01 * m11 + m02 * m12;
  c[o + 2] = m00 * m20 + m01 * m21 + m02 * m22;
  c[o + 3] = m10 * m10 + m11 * m11 + m12 * m12;
  c[o + 4] = m10 * m20 + m11 * m21 + m12 * m22;
  c[o + 5] = m20 * m20 + m21 * m21 + m22 * m22;
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

// antimatter15 .splat: 32 bytes per splat
// position f32×3 · scale f32×3 · rgba u8×4 · quaternion u8×4 (w,x,y,z mapped to [-1,1])
export function parseSplat(buf: ArrayBuffer): SplatData {
  const count = Math.floor(buf.byteLength / 32);
  const f32 = new Float32Array(buf, 0, count * 8);
  const u8 = new Uint8Array(buf);
  const d = alloc(count, true);
  for (let i = 0; i < count; i++) {
    const f = i * 8, b = i * 32;
    d.positions[i * 3] = f32[f];
    d.positions[i * 3 + 1] = f32[f + 1];
    d.positions[i * 3 + 2] = f32[f + 2];
    writeScaleRot(
      d, i, f32[f + 3], f32[f + 4], f32[f + 5],
      (u8[b + 28] - 128) / 128, (u8[b + 29] - 128) / 128, (u8[b + 30] - 128) / 128, (u8[b + 31] - 128) / 128,
    );
    d.colors.set(u8.subarray(b + 24, b + 28), i * 4);
  }
  return d;
}

const PLY_TYPES: Record<string, [number, (v: DataView, o: number) => number]> = {
  char: [1, (v, o) => v.getInt8(o)], int8: [1, (v, o) => v.getInt8(o)],
  uchar: [1, (v, o) => v.getUint8(o)], uint8: [1, (v, o) => v.getUint8(o)],
  short: [2, (v, o) => v.getInt16(o, true)], int16: [2, (v, o) => v.getInt16(o, true)],
  ushort: [2, (v, o) => v.getUint16(o, true)], uint16: [2, (v, o) => v.getUint16(o, true)],
  int: [4, (v, o) => v.getInt32(o, true)], int32: [4, (v, o) => v.getInt32(o, true)],
  uint: [4, (v, o) => v.getUint32(o, true)], uint32: [4, (v, o) => v.getUint32(o, true)],
  float: [4, (v, o) => v.getFloat32(o, true)], float32: [4, (v, o) => v.getFloat32(o, true)],
  double: [8, (v, o) => v.getFloat64(o, true)], float64: [8, (v, o) => v.getFloat64(o, true)],
};

// Binary little-endian PLY as written by the original 3DGS trainer
// (x,y,z · f_dc_0..2 · opacity · scale_0..2 · rot_0..3). Plain coloured point clouds also load.
export function parsePly(buf: ArrayBuffer): SplatData {
  const head = new TextDecoder('latin1').decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 65536)));
  const endIdx = head.indexOf('end_header');
  if (!head.startsWith('ply') || endIdx < 0) throw new Error('Not a PLY file');
  const bodyStart = head.indexOf('\n', endIdx) + 1;
  if (!head.includes('format binary_little_endian')) throw new Error('Only binary little-endian PLY is supported');

  let count = 0, stride = 0, inVertex = false;
  const props: Record<string, { offset: number; read: (v: DataView, o: number) => number }> = {};
  for (const line of head.slice(0, endIdx).split('\n')) {
    const t = line.trim().split(/\s+/);
    if (t[0] === 'element') {
      if (inVertex) break;
      inVertex = t[1] === 'vertex';
      if (inVertex) count = parseInt(t[2], 10);
    } else if (t[0] === 'property' && inVertex) {
      if (t[1] === 'list') throw new Error('PLY list properties are not supported');
      const type = PLY_TYPES[t[1]];
      if (!type) throw new Error(`Unknown PLY type ${t[1]}`);
      props[t[2]] = { offset: stride, read: type[1] };
      stride += type[0];
    }
  }
  if (!count || !props.x) throw new Error('PLY has no vertex positions');

  const view = new DataView(buf, bodyStart);
  const get = (name: string, fallback: number) => {
    const p = props[name];
    return p ? (i: number) => p.read(view, i * stride + p.offset) : () => fallback;
  };
  const x = get('x', 0), y = get('y', 0), z = get('z', 0);
  const isGaussian = 'f_dc_0' in props;
  const r = isGaussian ? get('f_dc_0', 0) : get('red', 255);
  const g = isGaussian ? get('f_dc_1', 0) : get('green', 255);
  const b = isGaussian ? get('f_dc_2', 0) : get('blue', 255);
  const op = get('opacity', 10);
  const s0 = get('scale_0', -4.6), s1 = get('scale_1', -4.6), s2 = get('scale_2', -4.6);
  const q0 = get('rot_0', 1), q1 = get('rot_1', 0), q2 = get('rot_2', 0), q3 = get('rot_3', 0);

  const d = alloc(count, true);
  for (let i = 0; i < count; i++) {
    d.positions[i * 3] = x(i);
    d.positions[i * 3 + 1] = y(i);
    d.positions[i * 3 + 2] = z(i);
    writeScaleRot(d, i, Math.exp(s0(i)), Math.exp(s1(i)), Math.exp(s2(i)), q0(i), q1(i), q2(i), q3(i));
    const c = i * 4;
    if (isGaussian) {
      d.colors[c] = clamp255(0.5 + SH_C0 * r(i));
      d.colors[c + 1] = clamp255(0.5 + SH_C0 * g(i));
      d.colors[c + 2] = clamp255(0.5 + SH_C0 * b(i));
    } else {
      d.colors[c] = r(i); d.colors[c + 1] = g(i); d.colors[c + 2] = b(i);
    }
    d.colors[c + 3] = clamp255(1 / (1 + Math.exp(-op(i))));
  }
  return d;
}

export function parseAny(buf: ArrayBuffer, name = ''): SplatData {
  const magic = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(3, buf.byteLength)));
  return magic === 'ply' || name.toLowerCase().endsWith('.ply') ? parsePly(buf) : parseSplat(buf);
}

// Cosine palette (Inigo Quilez)
function palette(t: number, out: number[]) {
  for (let k = 0; k < 3; k++) {
    out[k] = 0.5 + 0.5 * Math.cos(2 * Math.PI * (t + [0.0, 0.33, 0.67][k]));
  }
}

// Torus knot built from flat, surface-aligned gaussians plus a halo of dust.
// Lighting is baked into the colours — splats have no view-dependent shading here.
export function proceduralKnot(count = 180000): SplatData {
  const geo = new THREE.TorusKnotGeometry(1, 0.3, 600, 56, 2, 3);
  const pos = geo.attributes.position.array as Float32Array;
  const nor = geo.attributes.normal.array as Float32Array;
  const uvs = geo.attributes.uv.array as Float32Array;
  const idx = geo.index!.array;

  const tris = idx.length / 3;
  const cum = new Float64Array(tris);
  let area = 0;
  for (let t = 0; t < tris; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    area += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    cum[t] = area;
  }

  const dust = Math.floor(count * 0.1);
  const surface = count - dust;
  const sigmaT = Math.sqrt(area / surface) * 0.75;
  const L = new THREE.Vector3(0.45, 0.75, 0.5).normalize();
  const d = alloc(count, false);
  const col = [0, 0, 0];

  for (let i = 0; i < surface; i++) {
    const target = Math.random() * area;
    let lo = 0, hi = tris - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1; else hi = mid;
    }
    const ia = idx[lo * 3], ib = idx[lo * 3 + 1], ic = idx[lo * 3 + 2];
    const r1 = Math.sqrt(Math.random()), r2 = Math.random();
    const wa = 1 - r1, wb = r1 * (1 - r2), wc = r1 * r2;
    const lerp = (arr: ArrayLike<number>, k: number, n: number) =>
      arr[ia * n + k] * wa + arr[ib * n + k] * wb + arr[ic * n + k] * wc;

    const px = lerp(pos, 0, 3), py = lerp(pos, 1, 3), pz = lerp(pos, 2, 3);
    let nx = lerp(nor, 0, 3), ny = lerp(nor, 1, 3), nz = lerp(nor, 2, 3);
    const nl = Math.hypot(nx, ny, nz);
    nx /= nl; ny /= nl; nz /= nl;
    const u = lerp(uvs, 0, 2), v = lerp(uvs, 1, 2);

    d.positions.set([px, py, pz], i * 3);

    // flat disc: wide in the tangent plane, thin along the normal
    const st = sigmaT * (0.7 + Math.random() * 0.6);
    const st2 = st * st, sn2 = (st * 0.08) ** 2, k = sn2 - st2;
    d.covariances.set([
      st2 + k * nx * nx, k * nx * ny, k * nx * nz,
      st2 + k * ny * ny, k * ny * nz,
      st2 + k * nz * nz,
    ], i * 6);

    palette(u * 3 + v * 0.12 + 0.55, col);
    const groove = Math.abs(((u * 90) % 1) - 0.5) < 0.09 ? 0.45 : 1;
    const diff = Math.max(nx * L.x + ny * L.y + nz * L.z, 0);
    const spec = Math.pow(diff, 28) * 0.55;
    const jitter = 0.92 + Math.random() * 0.16;
    for (let c = 0; c < 3; c++) {
      d.colors[i * 4 + c] = clamp255((col[c] * (0.22 + 0.85 * diff) * groove + spec) * jitter);
    }
    d.colors[i * 4 + 3] = 235;
  }

  for (let i = surface; i < count; i++) {
    const r = 1.7 + Math.pow(Math.random(), 2) * 1.4;
    const th = Math.random() * Math.PI * 2, cz = Math.random() * 2 - 1, s = Math.sqrt(1 - cz * cz);
    d.positions.set([r * s * Math.cos(th), r * cz * 0.6, r * s * Math.sin(th)], i * 3);
    const sd = (0.003 + Math.random() * 0.007) ** 2;
    d.covariances.set([sd, 0, 0, sd, 0, sd], i * 6);
    palette(th / (Math.PI * 2) + 0.2, col);
    for (let c = 0; c < 3; c++) d.colors[i * 4 + c] = clamp255(0.55 + col[c] * 0.45);
    d.colors[i * 4 + 3] = clamp255(0.25 + Math.random() * 0.6);
  }

  geo.dispose();
  return d;
}
