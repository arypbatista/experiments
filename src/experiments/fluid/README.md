# fluid

2D Eulerian grid fluid simulation using semi-Lagrangian advection and pressure projection.

## What it does

A velocity field lives on a regular grid. Each frame, the solver advects the velocity through itself (backtrace particles one step), damps it slightly, then projects it to be divergence-free via a Jacobi pressure solve. A separate RGB dye field is advected by the same velocity field — this is what you see on screen. Dragging injects a Gaussian splat of velocity and dye simultaneously; dye hue cycles continuously through HSV.

## Controls

| Input | Action |
|---|---|
| Drag | Inject dye + velocity |
| C | Clear all |
| Sliders | Dye decay, brush size, force scale |

## Physics / Algorithm

**Advection** — semi-Lagrangian (unconditionally stable): for each cell, trace a particle backward one step using current velocity, sample the field there with bilinear interpolation, and write that value to the cell.

```
q(x, t+dt) = q(x - u(x,t)·dt, t)
```

**Pressure projection** — makes velocity divergence-free so fluid is incompressible:

1. Compute divergence: `div[i] = 0.5·(u[i+1] − u[i−1] + v[i+COLS] − v[i−COLS])`
2. Solve `∇²p = div` via Jacobi iteration: `p[i] = (p[left]+p[right]+p[up]+p[down] − div[i]) / 4`
3. Subtract pressure gradient: `u[i] -= 0.5·(p[i+1] − p[i-1])`, same for v

Boundary conditions: no normal flow (velocity component = 0 at walls).

### Constants

| Constant | Value | Notes |
|---|---|---|
| `SCALE` | 4 | Screen pixels per grid cell |
| `ITERS` | 30 | Jacobi pressure iterations |
| `DAMPING` | 0.999 | Velocity multiplier per step |
| `dyeDecay` | 0.995 | Dye fade multiplier per step (slider) |

## Tuning tips

- **Dye fades too fast**: increase dye decay toward 1.0.
- **Fluid looks blocky**: decrease SCALE (finer grid, more expensive).
- **Simulation unstable**: reduce force or increase ITERS.
- **Sluggish response**: increase force slider or drag faster.
- **Color washes out white**: dye accumulates — reduce decay or clear.
