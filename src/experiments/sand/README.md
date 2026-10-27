# sand

A falling-sand cellular automaton driven by a per-material config table, plus point attractors that pull particles in.

## What it does

The screen is a grid of 3×3 px cells. Each cell holds one material. Every frame the grid is updated in place: sand and soil fall and pile into slopes, water falls and spreads sideways, fire burns, ignites nearby sand, turns into smoke, and goes out when it touches water. Smoke rises and fades. Walls stay where you put them. An attractor is a single fixed cell that draws nearby particles toward it, so they spiral in and collect around it.

The **global gravity** toggle (on by default) turns all vertical movement on or off. With it off, only attractors move particles, so you can build orbiting clouds without them falling.

## Controls

| Input | Action |
|---|---|
| Click + drag / touch | Paint the selected material |
| 1 / 2 / 3 / 4 | Sand / Water / Fire / Wall |
| 5 | Attractor (single cell) |
| 6 | Soil |
| E | Eraser |
| C | Clear the grid |
| brush slider | Brush radius (1–20 cells; attractor always 1 cell) |
| global gravity | Turn gravity on or off for all materials |

## Algorithm

### Update order

1. `applyAttractors()`: for each attractor cell, scan the grid window around it (clamped to the grid). Each movable particle moves with probability `min(STRENGTH / dist², 0.9)`. It first tries one inward step along a single axis, picking x or y in proportion to `|dx|` and `|dy|` so the collected shape stays round and not diamond-shaped. If that cell is taken, it tries the two tangent directions in random order, which makes particles slide around the ring.
2. Bottom-to-top pass over materials with `gravity > 0`. Rows alternate between left-to-right and right-to-left to avoid a sideways drift.
3. Top-to-bottom pass over materials with `gravity <= 0` (smoke, fire, static materials).

A `moved` mask stops a particle from being updated twice in one frame.

A particle with gravity steps into the cell below it (above it for negative gravity) if that cell is empty or holds a *lighter* material, which swaps the two. Otherwise it tries the two diagonals below, then, if `sidewaysFlow` is set, the cells to its left and right.

### Material config fields

| Field | Meaning |
|---|---|
| `gravity` | `1` falls, `-1` rises, `0` doesn't move vertically |
| `density` | Heavier materials sink through lighter ones |
| `sidewaysFlow` | Spreads sideways when it can't fall (water) |
| `ephemeral` | `life` counts down each frame, and the particle dies at 0 |
| `deathMaterial` / `deathLife` | What it turns into when it dies, and that material's lifetime |
| `sideEffect` | Per-frame hook (fire: ignite sand, quench on water, emit smoke) |
| `brushRadius` | Overrides the brush size for this material |

Configs are merged with the defaults once at startup, and lookups index into the resulting array.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `CELL` | 3 | Screen pixels per grid cell |
| `ATTRACTOR_RADIUS` | 1000 | Scan radius; effectively the whole grid |
| `ATTRACTOR_STRENGTH` | 1000 | Pull probability numerator (`/ dist²`, capped at 0.9) |

## Tuning tips

- **Slow with many attractors**: each attractor scans the whole grid every frame. Lower `ATTRACTOR_RADIUS` (to around 150) or raise `CELL`.
- **Attractor pull too weak at range**: increase `ATTRACTOR_STRENGTH`.
- **Water too runny / sticky**: change `sidewaysFlow` or water `density`.
- **Fire spreads too fast**: lower the `0.015` ignition chance in `fireSideEffect`.
