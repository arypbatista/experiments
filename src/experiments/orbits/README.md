# orbits

N-body gravitational simulation — drag to launch bodies, watch them orbit, merge, and fling each other apart.

## What it does

A star sits near the scene center, with three planets in stable circular orbits at random starting angles. All bodies interact via full Newtonian gravity (every pair, every frame). Bodies merge on collision, conserving momentum and growing in radius. Bodies that escape far off-screen are removed.

Force lines connect every pair of bodies — thickness and opacity scale with the gravitational force magnitude, making dominant pulls obvious at a glance.

## Controls

| Input | Action |
|---|---|
| Drag | Slingshot: pull back from spawn point, release to launch in opposite direction |
| Scroll wheel | Zoom in / out toward cursor |
| Pinch | Zoom on touch devices |
| R | Reset to initial 3-planet system |
| F | Fit view (reset zoom and pan) |

## Physics

All-pairs Newtonian gravity with softening to prevent blowup at close range:

```
f  = G * mi * mj / max(r², softening²)
ax = f * dx / r³   (accumulated per body)
```

Integrated with Euler at 8 sub-steps per frame (~0.006 s per sub-step at 60 fps).

Collision detection: if distance < ri + rj, bodies merge. Momentum is conserved; the surviving body absorbs the dead body's mass and position (mass-weighted centroid).

### Constants (initial defaults)

| Parameter | Value | Notes |
|---|---|---|
| `G` | 1 | Scaled gravitational constant |
| `STAR_MASS` | 3,000,000 | Central star; gives stable orbits at the chosen radii |
| Spawn mass | 1,000 | Mass of drag-launched bodies |
| Sling speed | 2.5 | px drag length → px/s velocity multiplier |
| Trail fade | 0.04 | Canvas alpha overlay per frame (~1 s tail at 60 fps) |

## Tuning tips

- **Bodies barely interact**: increase `gravity` slider — at G=1 the 1,000-mass spawned bodies feel very little from each other. Try spawning massive bodies (mass slider up) near each other.
- **Orbits too tight / too wide**: zoom out (scroll) to see bodies that have escaped, or zoom in to watch a close flyby.
- **Chaos wanted**: spawn several equal-mass bodies close to each other with low velocity and crank G up.
- **Stable solar system**: keep spawned bodies small, aim tangentially to an existing orbit, match orbital speed (drag length ≈ existing body's orbital radius × 0.4).
- **Trail too short / too long**: `trails` slider — low value = long persistent tail, high value = bodies leave almost no mark.
