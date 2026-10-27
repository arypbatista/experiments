# xul-hills

An editor for layered hill silhouettes in the style of Xul Solar's 1949 colored-pencil landscapes: dark rims, saturated bodies, misty valleys.

## What it does

Every shape is a hill profile standing on the ground. It is either a **curve** (a dome, from a soft mound up to a tall thimble) or a **peak** (from a convex mountain up to a concave spire or cypress). Each shape belongs to one of 8 depth layers.

Shapes affect each other in two ways:

- **Same layer → they merge.** Overlapping profiles join through a smooth max, so a row of domes becomes one undulating ridge with raised saddles. Where they meet, their palettes blend according to which shape is taller there.
- **Different layers → the front one hazes the back one.** A front hill hides what is behind it, and the back hill fades toward pale mist close to the front ridge. This is the white glow you see behind the hills in the painting.

Inside each hill, the pencil is dense and dark along the ridge (the rim), darker on the side facing away from the light, and fades into mist further down. The pigment goes down as strokes that follow the contour, and the paper grain breaks them up.

## Controls

| Input | Action |
|---|---|
| Click on sky | Add a shape (current tool, layer and palette) |
| Shift+click / double-click | Add a shape anywhere, even over hills |
| Drag hill or its ● handle | Move it (apex follows the pointer) |
| Drag ◆ handle | Change width |
| Drag sun | Move the sun |
| Wheel / Shift+wheel | Width / sharpness of the selected shape |
| Q / W | Curve / peak tool |
| [ / ] | Send selected shape one layer back / forward |
| 1–8 | Palette |
| D | Duplicate |
| Delete / Backspace | Remove selected |
| Esc | Deselect (panel then edits the defaults for new shapes) |
| H | Toggle handles |
| R | Reset to the Xul composition |
| C | Clear all shapes |
| E | Export a 3000×2100 PNG |

The composition autosaves to localStorage.

## Algorithm

Hills are 1-D height fields, so most of the work runs on the CPU, once per device-pixel column:

```
curve: h = top · (1 − |u|^p)^m      p = 1.6 + 3.4·sharp,  m = 1.3 − 0.75·sharp
peak:  h = top · (1 − |u|)^q        q = 0.45 + 2.2·sharp
u = (x − cx) / w
layer ridge H(x) = smax_k(h₁, h₂, …)         polynomial smooth max, k = merge
```

The CPU writes a float texture (one column per pixel, 32 rows): ridge height + slope, blended edge color, blended body color, and the **front envelope** (the highest ridge among the layers in front). The fragment shader then composites the layers from front to back:

- `d = (H − y) / √(1 + H′²)` ≈ distance below the ridge → rim darkness `exp(−d/rim)` and mist `smoothstep(0.25·mist, mist, d)`.
- Light: 2-D normal `(−H′, 1)` against the light angle tints the rims and adds a warm highlight.
- Halo: 2-D distance to the front envelope, sampled at 13 horizontal offsets. A steep peak gets a halo *around* it instead of a column *above* it.
- Pencil, in **contour space**: `uv = (S(x) + (y − H)·H′/n, d)` with `n = √(1 + H′²)`. `S` is the arc length along the ridge, computed on the CPU. `uv` is the foot point on the ridge and the depth below it, so strokes bend exactly with the hill and nothing shears.
  - Strokes: bands one lead-width apart (`1.35·stroke`), each cut into tapered marks 28–68 units long, with random pressure, drift and tint.
  - Layers multiply like real pigment: a blotchy, granulating watercolor **wash**, then a hatching pass along the contour, then a lighter pass crossing it at ~10° where the color is dense.
  - Paper tooth (fbm) is subtracted from each pass's deposit, so the pencil skips over the paper and leaves white specks.
  - The sky uses the same strokes, horizontal. The sun's strokes run in circles around it.

### Constants

| Constant | Default | Notes |
|---|---|---|
| `rim` | 22 | Rim falloff in design units (canvas is 1000×700) |
| `mist` | 260 | Depth below the ridge where the hill fades to mist |
| `halo` | 26 | Size of the mist glow above front ridges |
| `merge` | 40 | Smooth-max radius. 0 = hard union with a visible notch |
| `MAXL` | 8 | Depth layers |

## Tuning tips

- **Hills look like flat cut-outs**: raise `rim` or lower `mist`.
- **Too washed out / white**: raise `mist`, lower `halo`.
- **Strokes too visible / look like contour lines**: lower `hatching` or raise `wash`.
- **Texture too fine at export size**: raise `stroke size`. Length and width live in `strokes()`.
- **White flecks too strong**: lower `paper grain`.
- **Merged ridge has notches**: increase `merge`.
- **Want the painting's thimbles**: curve with sharpness ~0.7–0.8. For cypresses use a peak with sharpness ~0.4 and a small width.
