# ink-reveal

Reveals an ink drawing as root growth confined to the strokes: tip-growth with branching, followed by slow secondary thickening.

## What it does

Several root systems start at once, at thick-ink spots kept apart from each other (scattered over the whole drawing, along the bottom, around the edges, or near the center). Each root tip crawls along the ink with momentum and a slow wander, choosing its heading by looking a few pixels ahead. Tips fork where the stroke splits, send out short probing laterals into thick ink, hesitate now and then, and die when they run out of fresh ink. The path a tip leaves is a 1-px grey tendril. Behind it, the root matures: a slow, jittered front spreads sideways from every revealed pixel to fill the true stroke width, and every pixel darkens to its real ink value. When too few tips are alive, new ones sprout from mature roots toward unexplored ink. Once nothing is left to grow, any unreachable specks fade in, so the final frame equals the original drawing.

## Controls

| Input | Action |
|---|---|
| Click / tap on ink | Plant one more root system (4 tips) in the running growth; if growth has finished, restart with the click as one of the origins |
| R / RESTART | Regrow with the current parameters |
| Space / PAUSE | Pause or resume |
| Preset select | Roots, Mycelium, Lightning, Slow growth (restarts) |
| placement, origins | Where and how many root systems start (restarts) |
| speed, branching, wander, thin phase, maturation, max tips | Apply live |

The parameter panel is hidden on touch devices.

### Presets

| Preset | origins | placement | speed | branching | wander | thin phase | maturation | max tips |
|---|---|---|---|---|---|---|---|---|
| Roots | 6 | scattered | 2.4 | 0.035 | 0.40 | 17 | 150 | 80 |
| Mycelium | 16 | scattered | 3.2 | 0.09 | 0.80 | 42 | 320 | 180 |
| Lightning | 5 | edges | 7 | 0.02 | 0.05 | 12 | 60 | 48 |
| Slow growth | 3 | bottom | 0.8 | 0.03 | 0.50 | 30 | 280 | 40 |

## Algorithm

- **Fields**: `ink` (0..1), `S` = ink box-blurred (r=1), `D` = chamfer distance to paper (stroke half-width).
- **Tip step** (1 px): score 7 candidate headings `a + k·spread` by sampling 3 points ahead (1.8, 3.6, 5.4 px): `S·(revealed ? 0.25 : 1) + 0.03·min(D,6)`, minus a turning cost. Turn `0.6 − 0.375·wander` of the way toward the best heading, add a sine wander of amplitude `0.15·wander`, move 1 px, reveal the pixel as root path.
- **Probe / death**: when the best score is low the tip slows and widens its search cone; after `STALL_LIMIT` probes it dies. Walking more than `HUNGER_LIMIT` steps over already-revealed ink also kills it.
- **Branching**: fork into the second-best heading when it is distinct (>0.6 rad) and good; short-lived laterals (root hairs) leave at ±0.9–1.5 rad, more often in wide strokes.
- **Thickening**: every revealed pixel schedules its 4-neighbours (ink > `T_LOW`) in a 256-frame bucket ring with a random delay around thin phase. This is a randomized Dijkstra front, so stroke flesh grows in organically.
- **Maturation**: root-path pixels start at 50% of their ink and ease to 100% over maturation frames; thickened pixels ease from 0 over a third of that.
- **Origins**: farthest-point sampling over thick ink (`D ≥ 2.5`) inside the placement region (elliptical radius for edges/center, lowest 20% for bottom). Each origin launches 2 tips in opposite directions (1 upward for bottom).
- **Sprouting**: when tips < 37.5% of max tips, sample root pixels older than `SPROUT_AGE` and look for a direction with unrevealed ink 3–9 px out. If growth stalls, scan for unreached ink and sprout from the nearest revealed pixel, or seed an isolated island.

### Constants

Panel parameters are listed under Presets. Fixed constants:

| Constant | Value | Notes |
|---|---|---|
| `HAIR_P` | 0.012 | Lateral probe chance per step |
| `STALL_LIMIT` | 14 | Probing steps before a tip dies |
| `HUNGER_LIMIT` | 22 | Steps over revealed ink before a tip dies |
| `SPROUT_AGE` | 45 | Frames before a root pixel may sprout |
| `T_TIP` / `T_LOW` | 0.3 / 0.02 | Ink thresholds for tips and thickening |
| `RING` | 256 | Thickening bucket ring (must exceed ~2.1 × max thin phase) |

Flesh (thickened pixels) matures in a third of the maturation time.

With the Roots preset a full grow takes about 2000 frames (~35 s at 60 fps). A simulation step costs about 0.15 ms; most of each frame is one `putImageData` of the 569×1000 bitmap.

## Tuning tips

- **Strokes fill in too fast, tendrils barely visible**: raise thin phase.
- **Whole reveal too slow**: raise speed, origins or max tips.
- **Too bushy / hairy**: lower `HAIR_P` and branching.
- **Tips die too early in sparse areas**: raise `STALL_LIMIT`, or lower the 0.28 score threshold in `stepTip`.
