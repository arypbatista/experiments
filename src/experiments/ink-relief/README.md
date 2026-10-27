# ink-relief

The ink drawing turned into three physical objects, each with its own material and a lamp you hold with the cursor.

## What it does

Relief only shows up when light grazes it, so in every mode the cursor is a lamp: move it over the object and the light comes from there. Close to the cursor the light falls from above and the surface flattens out. Further away it rakes across and every ridge throws a shadow.

1. **Blind emboss.** A sheet of cotton paper with a deckled edge on a dark table. The lines are pushed up into the paper with no ink at all, the way an intaglio plate does it, and the plate leaves its shallow rectangular plate mark around the image. White on white: without raking light it all but disappears.
2. **Black lacquer.** The strokes are laid on thick in glossy black paint. Each stroke has a rounded meniscus at the edge, pools where strokes are dense, and has faint brush ridges. A linseed halo stains the paper around it. Flat tops stay black, and the wet edges pick up a studio softbox and the lamp.
3. **Pinscreen.** A pin-art board: about 16k nickel pins in a black frame, each pushed out by the ink under it. They rise row by row when you enter the mode. This is real geometry with shadow maps, so you can orbit it.

Append `#emboss`, `#lacquer` or `#pins` to the URL to open a mode directly. Add `?still` to skip the pin intro (used for screenshots).

## Controls

| Input | Action |
|---|---|
| Move cursor | Move the lamp |
| 1 / 2 / 3 | Emboss / lacquer / pinscreen |
| Light height slider | Raise the lamp (low = more raking) |
| Drag, scroll (pinscreen) | Orbit, zoom |
| Touch drag (emboss, lacquer) | Move the lamp |

## Algorithm

**Emboss and lacquer** use one full-screen plane and one fragment shader (`relief.ts`). In JS, the ink is padded to a sheet and baked into a half-float RGBA texture:

- R: emboss height, `cockle + 2.4·(0.55·blur1 + 0.45·blur4)^0.85 − 0.9·plateMark`
- G: lacquer height, `cockle + cover·(2.2·√blur2(mask) + 3.2·blur8(mask))`. The square root turns the blurred edge into a rounded meniscus, and the wide blur adds pooling.
- B: lacquer coverage. A: a wide blur of the coverage, used for the oil halo.

For each pixel the shader rebuilds the scene as a heightfield (table, then paper thickness and cockle, then relief). It takes normals by central differences on a detailed height that adds paper tooth and brush ridges. It ray-marches up to 44 steps toward the point light for soft shadows (`res = min(res, k·(ray.z − h)/t)`), and shades with Lambert + GGX, an analytic studio environment (softbox plus a rim strip), ACES and grain.

**Pinscreen** (`pins.ts`) is an `InstancedMesh` of merged dome + shaft geometry. Each pin's protrusion is the box-blurred ink at its centre, normalised to the 98.5th percentile and raised to the power 0.8. The pins are lit by a shadow-casting directional light that sits above the cursor's point on the board, plus a dim PMREM `RoomEnvironment` for the metal.

### Constants

| Constant | Where | Value | Notes |
|---|---|---|---|
| `MARGIN` | relief.ts | 90 | Paper around the drawing |
| `THICK` | shader | 1.4 | Paper thickness: sets the shadow cast on the table |
| `MAXH` | shader | 11 | Ray-march exit height; must stay above the tallest relief |
| `PINS_X` | pins.ts | 96 | Pins across, ~16k in total |
| `PIN_MAX` | pins.ts | 30 | Maximum pin protrusion |
| `FOLLOW` | index.astro | 7 | How fast the lamp chases the cursor |

## Tuning tips

- **Emboss too subtle**: raise the `2.4` factor of R in `buildHeightTexture`, or lower the light.
- **Lacquer looks matte**: raise the softbox gain in `studio()` or lower the lacquer roughness (`0.1`).
- **Shadows cut off far from ridges**: raise the step cap in `shadow()` (44), or `MAXH` if you increased heights.
- **Slow on a laptop**: the relief modes cap the pixel ratio at 1.5. Drop that to 1, or lower the march steps. In the pinscreen, lower `PINS_X` or the shadow map size.
- **Pins look like a flat grey field**: lower `environmentIntensity`. The key light has to carry the image.
