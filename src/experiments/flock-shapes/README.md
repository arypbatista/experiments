# Flock Shapes

Particles flock together to form a series of 3D shapes. Each particle is an autonomous agent
driven by steering behaviors — seek and avoid — ported from
[dcg-foundry](https://github.com/DCG-foundry/dcg-foundry-master), a Gatsby marketing site
whose animated hero section inspired this experiment.

## How it works

### Steering (FlyingDot)

Each dot has a `position`, `velocity`, and `acceleration` (all `THREE.Vector3`). Two behaviors
are composed every frame:

**Seek** — steers the dot toward a target point using the classic Reynolds steering formula:

```
desired  = normalize(target - position) × maxSpeed × ratio
steer    = desired - velocity
steer    = clamp(steer, -maxForce, maxForce)
```

The `ratio` uses **nearer-slower** mode: `ratio = clamp(distance / steerVanishDistance, 0, 1)`.
This slows each dot as it approaches its target, producing a smooth landing rather than
overshooting oscillations.

**Avoid** — pushes the dot away from a single repulsion point:

```
awayDir     = position - avoidPoint
seekTarget  = awayDir × (20 / distance) × decay + position
```

`decay` decreases by ×0.985 each frame, so the repulsion fades over roughly 6 seconds.

### Cluster (FlyingCluster)

Manages all dots as a group:

- `seek(points)` — assigns each dot a target from the shape array. If there are more dots than
  shape points, the excess get slightly offset duplicates so all dots remain active.
  Returns a Promise that resolves when the **average** distance across all dots drops below 1 unit.
- `avoid(point)` — triggers a scatter burst; while active, `forcePercentage = 1 − avoidDecay`
  suppresses seek so dots scatter first, then gradually steer toward the new shape.
- `setBoost(speedMult, forceMult)` — temporarily multiplies `maxSpeed` and `maxForce` to speed up
  transitions. Used at 5× for the initial formation.

### Wave effect

Rendered positions are perturbed by a three-term sinusoidal ripple applied _after_ physics — the
underlying dot positions are clean, only the visuals wobble:

```
step        = initialStep[i] + globalStep   (globalStep += 0.01/frame)
delta(x,y,z) = (sin((x/2 + step)×2π) + cos((z/2 + step×2)×π) + sin(((x+y+step×2)/4)×π)) × impact
dx = x + delta(x, y, z)
dy = y + delta(dx, y, z)
dz = z + delta(dx, dy, z)
```

`impact` scales down for faster-moving dots (`impact = ripple × 0.75 × (1 − unitSpeed) + ripple × 0.25`),
which suppresses visual noise during transitions when dots are moving fast.

### Shape data

Seven shapes use `.sorted.vertices` files (pre-sorted so spatially adjacent points have nearby
array indices — this produces smoother transitions since dot _i_ seeks a nearby target rather
than one across the mesh). Figure08 uses the unsorted original. All files are JSON arrays of
`{x, y, z}` objects, capped at 3 500 points.

The choreography order (`Figure08 → 07 → 04 → 05 → 02 → 06 → 01 → 03`) matches the original
site's section-driven animation sequence.

## Parameters

| Slider   | Range         | Effect                                                            |
| -------- | ------------- | ----------------------------------------------------------------- |
| SPEED    | 0.05 – 0.60   | `maxSpeed` per dot per frame (world units)                        |
| FORCE    | 0.005 – 0.080 | `maxForce` steering limit per axis per frame                      |
| RIPPLE   | 0 – 0.35      | Wave displacement amplitude                                       |
| DOT SIZE | 0.3 – 2.5     | `THREE.PointsMaterial` size                                       |
| HOLD (s) | 1 – 10        | Seconds each formed shape is displayed before the next transition |

## Constants

| Constant              | Value          | Notes                                                          |
| --------------------- | -------------- | -------------------------------------------------------------- |
| `MAX_DOTS`            | 3 500          | Cluster size; fixed at init from the first shape's point count |
| `steerVanishDistance` | 10             | Distance at which seek ratio reaches 1 (full speed)            |
| `avoidDecayRate`      | 0.985          | Per-frame multiplier on avoidance strength                     |
| Initial boost         | 5×             | Speed and force multiplier applied only during first formation |
| Transition boost      | 1× (0.5 added) | `setBoost()` default — `maxSpeed × 1.5`, `maxForce × 1.5`      |

## Controls

| Input             | Action                                 |
| ----------------- | -------------------------------------- |
| Left-drag         | Orbit camera around scene center       |
| Scroll            | Zoom in / out (20 – 300 units)         |
| Shape buttons 1–8 | Jump to that figure; exits AUTO mode   |
| AUTO button       | Resume choreography from the beginning |

## Tuning tips

- **Faster transitions**: raise SPEED (0.4+) and FORCE (0.06+); dots converge in 1–2 s
- **Dreamy drift**: SPEED ≈ 0.08, FORCE ≈ 0.01, RIPPLE ≈ 0.25 — dots barely crawl, heavy wave
- **Crisp snap**: RIPPLE = 0, FORCE 0.06+ — shapes appear with minimal visual noise
- **The seek Promise resolves on average distance < 1**, so a few straggler dots arriving late
  won't block the choreography from advancing
