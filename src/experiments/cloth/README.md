# cloth

Verlet-integrated cloth simulation with mouse tearing and wind.

## What it does

A grid of point masses connected by distance constraints simulates cloth. The top row (or edges, depending on the shape) is pinned to fixed positions. Gravity pulls the cloth down each frame; constraint relaxation repeatedly corrects point distances to restore the rest length. Dragging the mouse tears nearby constraints. Wind applies a slowly oscillating horizontal force with random gusts.

## Controls

| Input | Action |
|---|---|
| Click + drag | Tear cloth |
| W | Toggle wind |
| R | Reset cloth |
| WIND button | Toggle wind |
| RESET button | Reset cloth |

## Physics / Algorithm

Each frame:

1. **Verlet integrate** — compute velocity from position delta, apply gravity + wind, advance position.
2. **Relax constraints** — iterate `stiffness` times over all active constraints, pushing each pair of points apart or together to restore their rest length.
3. **Floor** — clamp points below the canvas bottom.

Rest length for structural edges equals `spacing`; for diagonal shear edges it equals `spacing * √2`.

Tearing: constraints whose midpoint falls within `tear_radius` of the mouse cursor are deactivated.

### Constants

| Parameter | Default | Notes |
|---|---|---|
| `gravity` | 0.45 | px/frame² downward acceleration |
| `damping` | 0.99 | velocity multiplier per frame (1 = no loss) |
| `stiffness` | 8 | constraint relaxation iterations |
| `wind strength` | 0.35 | peak horizontal force when wind is on |
| `tear radius` | 36 | px — midpoint distance threshold for tearing |

## Shapes

| Shape | Pins | Description |
|---|---|---|
| Curtain | Top row, every 5th | Classic hanging cloth with loose top |
| Full curtain | Entire top row | Rigid top edge, heavy drape |
| Flag | Left column, every 3rd | Cloth streams to the right |
| Hammock | 4 corners | Cloth sags freely between fixed corners |
| Banner | Top-left + top-right | Wide, short cloth swings from two points |
| Net | Top row, every 3rd | Looser grid, gaps visible when torn |

## Tuning tips

- **Cloth falls through itself**: expected — no self-collision. Increase `stiffness` to reduce bunching.
- **Too floppy**: increase `stiffness` or decrease `gravity`.
- **Too rigid / jittery**: decrease `stiffness` or increase `damping`.
- **Wind barely felt**: increase `wind strength`; flag shape shows wind most dramatically.
- **Tearing too easy**: decrease `tear radius`. Too hard: increase it.
