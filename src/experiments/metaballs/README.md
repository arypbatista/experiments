# metaballs

Marching-squares iso-surface of blended radial fields — organic blobs that bounce, merge, and stick to walls like water.

## What it does

Six blobs drift around the viewport, each emitting an inverse-square scalar field. The canvas is sampled on an 8 px grid; wherever the summed field exceeds a threshold of 1.0, the region is filled. A marching-squares pass traces the iso-contour between inside and outside cells, drawing smooth boundary segments. When two blobs approach each other their fields combine and they visually merge into one surface, then split apart as they separate. Each blob drifts through a slowly changing hue; merged regions interpolate between the contributing blob colors.

When a blob nears a wall, a mirror ghost blob is reflected across that wall edge. The ghost raises the field value between the blob and the wall, pulling the iso-surface outward until it touches — a meniscus that mimics water wetting glass.

## Controls

| Input | Action |
|---|---|
| Click / tap empty space | Spawn a new blob at that position |
| Drag a blob | Move it; release to throw with inertia |

## Physics / Algorithm

**Field function:**

```
f(p) = Σ  r²_i / |p - blob_i|²
```

The iso-surface is the level set `f(p) = 1.0`. Each blob's influence radius `r` (80–140 px) controls the size of the region above threshold.

**Wall ghosts (meniscus):**

When blob `i` is within `WALL_ATTRACT_DIST` of a wall, a ghost is added at the mirror position across that wall:

```
ghost position: reflect blob center across wall line
ghost strength: WALL_GHOST_STRENGTH × r²_i  (0.55 of real blob)
```

This makes the field near the wall higher than it would be otherwise, stretching the iso-surface to meet the boundary.

**Physics per frame:**

```
vx *= DAMPING          (0.993 — slow coast-down)
x  += vx
on wall hit: vx = -vx * RESTITUTION   (0.70 — lossy bounce)
```

Throw velocity on drag release is sampled from pointer delta / delta-time, scaled to 16 ms frame units so it feels the same at any refresh rate.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `CELL` | 8 px | Grid resolution for marching squares |
| `THRESHOLD` | 1.0 | Iso-surface level |
| `RESTITUTION` | 0.70 | Energy fraction kept on wall bounce |
| `DAMPING` | 0.993 | Per-frame velocity multiplier |
| `MAX_SPEED` | 18 px/frame | Velocity cap |
| `WALL_GHOST_STRENGTH` | 0.55 | Ghost contribution relative to real blob |
| `WALL_ATTRACT_DIST` | 160 px | Distance at which wall ghosts activate |

## Tuning tips

- **Blobs merge too early / too late**: adjust `THRESHOLD` — lower = blobs merge from farther away.
- **Wall sticking too strong or weak**: adjust `WALL_GHOST_STRENGTH` (0 = no effect, 1 = ghost as strong as real blob).
- **Sticking starts too far / too close**: adjust `WALL_ATTRACT_DIST`.
- **Blobs feel too floaty**: decrease `DAMPING` toward 0.97.
- **Bouncing feels too lively**: decrease `RESTITUTION` toward 0.4.
- **Performance is slow**: increase `CELL` to 12 or 16 — fewer grid samples, coarser edges.
