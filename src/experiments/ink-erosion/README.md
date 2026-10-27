# ink-erosion

The ink drawing as a cliff in a storm: particle rain, rivulets, rigid falling stones and support-based collapse on a falling-sand grid.

## What it does

The drawing is rasterised at half resolution into a grid of ROCK cells (darker ink = harder rock), surrounded by AIR, with loose SED (sediment) produced as it wears away. Three agents erode it:

- **Rain**: thousands of drops fall with gravity and wind. On impact they chip rock, splash spray, and turn into rivulets that run downhill along surfaces, cutting down into the rock beneath them and carrying sediment until they fall off an edge or soak in. Wet paths leave a fading grey wash.
- **Stones**: a few heavy rigid bodies (irregular inked blobs with spinning hatch marks). They bounce and roll, blast craters sized by mass × speed, fling chips and dust, punch through on hard hits, and crumble into the pile once they come to rest.
- **Collapse**: every few frames a flood fill from the drawing's base finds rock that is no longer connected to it. Each cut-off fragment falls as one rigid chunk and shatters into sediment on landing (with dust and a screen shake).

Sediment settles in grey strata (its tone drifts over time), slides at an angle of repose and piles up on the floor, which sits on the bottom edge of the screen.

## Controls

| Input | Action |
|---|---|
| 1 / RAIN | Pointer mode: hold to blast a water jet |
| 2 / STONES | Pointer mode: hold to grow a stone, release to drop or throw it |
| F / ROCKFALL | Burst of stones from above the figure |
| G / GUST | Gust of wind |
| R / RESET | Restore the drawing, clear water and stones |
| rain slider | Rain intensity (0–3) |

Automatic gusts and small rockfalls happen on their own.

## Constants

| Constant | Value | Notes |
|---|---|---|
| `RAIN` | 34 | Drops per frame at rain = 1 (storms surge ±50%) |
| `ERODE` | 0.7 | Damage chance per drop at terminal speed (scales with speed²) |
| `FLOW_ERODE` | 0.05 | Damage chance per step for a rivulet running over rock |
| `CARRY` | 5 | Grains one drop can carry |
| `SUPPORT_EVERY` | 8 | Frames between collapse checks |
| `STONE_MAX` | 18 | Largest boulder radius (cells) |
| `RESTITUTION` | 0.2 | Stone bounciness (stones.ts) |
| `PUNCH_SPEED` | 4.5 | Impact speed above which a stone ploughs through (stones.ts) |

## Tuning tips

- **Erosion too fast or too slow**: change `ERODE` and `FLOW_ERODE`, or `RAIN`.
- **Too few collapses**: rock only falls once it is fully cut off from the base; stones and the jet are the fastest way to sever overhangs.
- **Stones fly off too much**: lower `RESTITUTION` or narrow the rockfall spread in `rockfall()`.
- **Frame drops**: lower `SAND_PASSES` to 1 or reduce `MAXP`.
