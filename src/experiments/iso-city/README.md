# iso-city

Isometric city bowling — throw a ball through procedurally generated city blocks, knock down buildings, and scatter cars.

## What it does

Three city layouts (Grid, Diagonal, Ring) are rendered in a classic 2:1 isometric projection using a 2D canvas. Buildings are boxes with window dots drawn on their faces. Cars follow looping paths along the streets. Drag anywhere on the canvas to aim and release to throw a bowling ball. The ball travels with gravity and bounces weakly on landing. Buildings topple with angular physics when struck; cars get knocked flying. The draw order uses a painter's algorithm (`wx + wy + z * 0.5`) so the ball hides behind buildings when rolling at street level and appears in front when airborne.

## Controls

| Input | Action |
|---|---|
| Click + drag, release | Aim and throw the ball |
| R | Reset city |
| City selector | Switch between Grid / Diagonal / Ring layouts |
| Ball speed slider | Scale throw velocity (0.5× – 3×) |

## Physics / Algorithm

### Isometric projection

World coordinates `(wx, wy)` map to screen `(sx, sy)` via:

```
sx = OX + (wx - wy) * TW / 2
sy = OY + (wx + wy) * TH / 2
```

`TW = 80px`, `TH = 40px` (2:1 ratio). Z-height offsets only the screen-Y: `sy -= z * TH`.

### Throw

On `mouseup`/`touchend` the drag vector is converted from screen space to world space using the inverse projection. World-space delta is divided by a time constant to produce velocity. The ball launches from the pointer's world position.

### Ball physics

Simple Euler integration each frame (capped at 50 ms):

```
vz += GRAVITY * dt    // GRAVITY = -18
wx += vx * dt
wy += vy * dt
z  += vz * dt
vx *= FRICTION        // FRICTION = 0.985
```

On ground contact (`z <= 0`) the vertical velocity is reflected and attenuated (`vz *= -0.25`), horizontal velocity is dampened.

### Building collision

Per-building AABB check in world XY. On hit, angular velocity is added proportional to the ball's approach speed and inversely proportional to building height. The building tilts around the hit axis; when `angle > π/2` it is marked fallen and removed from further collision checks.

### Car movement

Each car steps along a polyline path each frame. Segment index advances when `t >= 1`. On ball contact (radius check + `z < 0.6`) the car is ejected with the ball's velocity plus a repulsion component.

### Depth sorting

All renderable objects (buildings, cars, ball) are sorted by `wx + wy` before drawing. The ball's sort key adds `z * 0.5` so it rises above buildings as it gains height.

## Tuning tips

- **Ball passes through buildings**: increase `ball.r` (default `0.38`) or widen the hit radius multiplier in `updateBall`.
- **Buildings too hard to knock over**: decrease the `/ (b.floors * 0.5 + 1)` divisor in the impulse calculation.
- **Ball feels floaty**: increase `GRAVITY` (make it more negative) or decrease `ball.vz` initial boost.
- **Cars too slow**: increase the `speed` range in `buildCity` (currently `0.018 – 0.032`).
