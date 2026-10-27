# dot-mesh

A spring-connected dot grid that reacts to the cursor, rendered side by side with p5.js and Three.js, with an optional microphone-driven mode.

## What it does

A grid of dots (20 rows, columns scaled to screen width) is joined to its neighbours by faint lines — horizontal, vertical and both diagonals. Each dot sits on a spring anchored to its grid position. When the pointer is inside the grid, nearby dots get a new rest position away from it, and the springs ease them there; when the pointer leaves, they settle back. The renderer selector switches between p5.js, p5.js + Mic, and Three.js (an orthographic camera where scene units equal pixels). All three share the same physics.

In mic mode, the loudness of the microphone sets the stimulus strength: quiet input pulls dots toward the pointer, loud input pushes them away.

## Controls

| Input | Action |
|---|---|
| Move cursor / touch | Push dots away from the pointer |
| Renderer select | Switch p5.js / p5.js + Mic / Three.js |
| Click canvas (Mic mode) | Ask for microphone access; released when you leave the mode |

## Algorithm

**Stimulus.** A pointer at `(sx, sy)` with `strength` acts within `radius = |strength| * 10` px. For a dot whose base is `b`:

```
d      = strength < 0 ? (s - b) : (b - s)    // pull vs push
ease   = (radius - |d|) / radius              // only when |d| < radius
target = b + d * ease
```

**Spring.** Each axis is integrated separately every frame:

```
f  = -k * (pos - target)
v  = damp * (v + f / mass)
pos += v
```

**Mic mapping.** The level is the RMS of the analyser's time-domain samples (values 0..1). It is mapped to

```
strength = min(level * 2000 - 20, 50)
```

so silence gives `-20` (pull toward the pointer, 200 px radius), and anything louder than 0.01 RMS pushes, capped at the normal mouse strength of 50 (500 px radius).

### Constants

| Constant | Value | Notes |
|---|---|---|
| `BASE_MESH_SIZE` | 20 x 20 | Columns scaled by `W / 800`; rows fixed |
| `BASE_MARGIN` | 50 | Scaled by `W / 800`; applies to all four sides |
| `k` | 0.035 | Spring stiffness |
| `damp` | 0.95 | Velocity damping per frame |
| Mouse strength | 50 | Radius 500 px |
| `fftSize` | 256 | Analyser size (128 time-domain samples) |

## Tuning tips

- **Dots wobble too long**: lower `damp` (e.g. 0.9).
- **Response feels sluggish**: raise `k`.
- **Mic too sensitive / never pulls**: lower the `2000` gain or raise the `-20` offset's magnitude.
- **Push area too large on small screens**: reduce the mouse strength of 50 (radius is strength x 10).
