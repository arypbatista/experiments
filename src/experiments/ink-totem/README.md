# ink-totem

Builds an endless totem pole from one ink drawing. Units are stitched together the way image quilting does it, along minimum-cost seams.

## What it does

The column is a stack of three kinds of unit, all carved from `public/ink-figure/ink.png`:

- **mask**: half of the drawing mirrored about an axis inside the ink mass, which gives a frontal, symmetric face. The half always reaches the paper margin, so the drawing's outer contour becomes the mask's silhouette.
- **head**: a horizontal window of the drawing with random flip, small rotation and anisotropic scale.
- **band**: a short, wide strip that sits between bigger units like a carved ring.

A small rule sets the rhythm: two masks never come in a row, bands lead into masks, and heads fill the space between. The column sways gently (two summed sines on `dx`).

Neighbouring units overlap by `OVERLAP` rows. Inside that overlap a dynamic-programming seam picks where one unit ends and the next begins. Each new unit is picked from `CANDIDATES` random source windows, and the one whose seam is cheapest wins. That way the totem "chooses" pieces whose strokes line up.

The view scrolls upward on its own, so the totem keeps growing. On wide screens two faint, smaller totems scroll behind it with parallax. A static grain tile scrolls with the sheet so the paper reads as one seamless surface.

## Controls

| Input | Action |
|---|---|
| Wheel / drag | Travel up and down |
| Click / tap a unit | Re-carve it (new source window, same slot, re-stitched to both neighbours) |
| Space | Pause / resume growth |
| N | New totem (new seed) |

## Algorithm

Seam cost per pixel in the overlap band, where `a` and `b` are the ink (0–1) of the upper and lower unit:

```
e(x, t) = (a - b)² + EDGE_PEN · edgeRamp(t)
```

Paper on both sides and ink on both sides are both cheap, so the cut runs through gaps or along strokes that continue across the join. A cut that would chop a stroke on one side only is expensive. The path moves at most one row per column. Each tile is the unit's ink masked between its top and bottom seams, with a feather of about 1.5 px that overlaps by 1 px so joins never go pale.

Unit params and seams are tiny and kept forever, so the chain stays deterministic. Ink fields and RGBA tiles are rebuilt on demand and evicted when far from the view.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `OVERLAP` | 110 | Rows shared by neighbours, i.e. how far a seam can wander |
| `CANDIDATES` | 7 | Source windows tried per unit |
| `EDGE_PEN` | 0.6 | Pushes seams away from the band edges |
| `HEIGHTS` | mask 400–480, head 310–390, band 235–270 | Includes both overlaps |
| `AUTO_SPEED` | 0.45 | Screen px per frame, upward |

## Tuning tips

- **Joins too visible**: raise `CANDIDATES` or `OVERLAP` (each costs a little more generation time).
- **Too many mirrored faces**: lower the mask probabilities in `nextKind`.
- **Column too stiff**: raise the sway amplitudes in `makeUnit`.
- **Background totems distracting**: lower `alpha` in `BACK` in `index.astro`.
