# Flock

GPGPU boids simulation using Three.js `GPUComputationRenderer`. Position and velocity are stored in floating-point textures and updated entirely on the GPU each frame — the CPU only uploads uniform values and issues a single draw call.

## How it works

Two ping-pong render targets are maintained:

| Texture | Contents |
|---|---|
| `texturePosition` | `xyz` world position |
| `textureVelocity` | `xyz` velocity vector |

Each frame, the **velocity shader** samples every other dot (O(N²) neighbor scan) and applies the three classic boid rules:

- **Separation** — steer away from dots that are too close (`pct < separationThresh`)
- **Alignment** — match the average heading of nearby dots (`separationThresh < pct < alignmentThresh`)
- **Cohesion** — steer toward the center of the local group (`pct > alignmentThresh`)

`pct = distSquared / zoneRadiusSquared` normalises distance into [0, 1] within the zone. The zone radius is the sum of the three distance sliders, and the thresholds are derived from their ratios.

Two additional forces are always active:

- **Center pull** — weak gravity toward origin (stronger on Y) keeps the flock from drifting off-screen
- **Predator** — the cursor projects into the simulation volume; dots within 150 units are repelled with a force that peaks at the boundary and falls to zero at the center

The **position shader** is a simple Euler integrator: `position += velocity * delta * 15`.

Dots are rendered as `THREE.Points` with a custom `ShaderMaterial`. Each vertex samples its own texel from `texturePosition` using a precomputed `reference` UV attribute. Point size is depth-scaled (`dotSize * 3 * 300 / -mvPos.z`) and clamped. Fragment color blends from blue (slow) to white (fast) based on speed.

## Constants

| Constant | Value | Notes |
|---|---|---|
| `BOUNDS` | 800 | Half-extents of the simulation volume in world units |
| `SPEED_LIMIT` | 9.0 | Max velocity magnitude; raised to 14 near the predator |
| `preyR` | 150 | Predator avoidance radius |
| Position step | `× 15` | Scales velocity into world units per second |
| Camera Z | 350 | Distance from origin; sets perspective scale for point sizing |

## Controls

| Control | Range | Effect |
|---|---|---|
| Dots | 256 / 1024 / 2304 / 4096 | Rebuilds GPGPU textures and geometry; higher counts increase GPU load quadratically |
| Separation | 0 – 100 | Distance at which dots push apart |
| Alignment | 0 – 100 | Distance at which dots match heading |
| Cohesion | 0 – 100 | Distance at which dots attract each other |
| Dot size | 0.3 – 3.0 | Multiplier on the depth-scaled point size |

## Tuning tips

- **Tight murmurations**: lower separation (≈5), raise alignment (≈40) and cohesion (≈30)
- **Loose drifting cloud**: raise all three distances equally (≈50 each)
- **Chaotic scatter**: max separation, zero alignment and cohesion
- **Performance**: the velocity shader runs in O(N²) — going from 1024 → 4096 dots is 16× more texture fetches per frame; on slower GPUs, prefer 1024 or 2304
