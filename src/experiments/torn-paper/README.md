# torn-paper

Rendering an arbitrary user-drawn polygon as a convincing piece of torn paper, entirely in a fragment shader.

## What it does

You draw a polygon over the canvas. The shader turns it into a sheet of coloured paper with a torn edge: the outline wobbles, the tear has small teeth, and a white band (the paper's core, exposed when it rips) runs along the border with an irregular, textured width. Loose fibers poke out of both the white core and the coloured face. The surface has a subtle relief lit by a movable light, and a soft drop shadow plus contact shadow sit underneath.

Optionally an image can be "printed" on the paper. The ink only lands on the coloured face (tearing exposes the uninked core), wears away in the paper's valleys, and bleeds slightly along the fibers.

The goal was real torn paper: the texture must not look like sandpaper or sand, the white rim must be textured with uneven width, and shapes can be organic but straight sides must be possible.

## Controls

| Input | Action |
|---|---|
| Click | Add a vertex (while drawing a new shape) |
| Click first vertex / Enter | Close the shape |
| Esc | Remove the last vertex (while drawing) |
| Drag vertex | Move it |
| Double-click vertex | Delete it |
| Double-click edge | Insert a vertex |
| Drop image / CHOOSE IMAGE | Print an image on the paper |
| Move image + drag / wheel | Reposition / resize the printed image |
| R / RETEAR | New random seed |
| N / NEW SHAPE | Start a new polygon |
| E / EXPORT PNG | Download a 2× PNG (cropped when "transparent" is on) |
| SAVE | Store the current paper in localStorage under the given name (same name overwrites) |
| OPEN / DELETE | Restore or remove the paper selected in the saved list |

## Algorithm

Two passes:

1. **Signed distance field** — the outline (straight polygon, or Catmull-Rom curve blended by *smoothing*) is uploaded as a 1-row float texture. A fragment pass writes the signed distance to the contour (negative inside) into an 800×600 `RGBA16F` texture, using even-odd winding for the sign.
2. **Paper** — per pixel, the distance `D` is offset by low-frequency noise (*wave*) and two octaves of finer noise (*tear teeth*). Two thresholds of that offset distance define the white rim (`dR`) and the coloured face (`dF`); the gap between them is the rim width, itself modulated by noise. The SDF gradient gives a local edge frame, so fiber noise is stretched across the edge (`vec2(dot(q, t), D * 0.12)`) to produce hairs. Relief is a height field from layered fbm, shaded with a normal derived from finite differences.

```
dR = D - wave - jag(q)
dF = D - wave + rimWidth - 0.8 * jag'(q)
```

### Design decisions

- Distance to the contour in a separate pass, not radius-by-angle from a centre: the latter breaks on concave or arbitrary user-drawn shapes.
- `RGBA16F` is linearly filterable in WebGL2 without extensions and precise enough near the edge; `RGBA32F` would need `OES_texture_float_linear`.
- No SVG export — the shader paints pixels. PNG only.
- Noise, light and thickness constants were tuned by eye from screenshots, not from a physical model. Tried and discarded:
  - multiply-blending the paper texture → looks like sandpaper;
  - relief normal factor ~2.2 → looks like sand;
  - semi-transparent edge hairs without a base colour beneath → grey and dirty.

## Known limitations

- The fiber coordinate `dot(q, t)` jumps at sharp concave corners.
- The SDF is 800×600; 2× export interpolates it (hidden by the noise).
- Self-intersecting polygons are filled even-odd and leave holes.
- The image can't be dragged outside the canvas (points are clamped to 0..800 / 0..600).
- No undo; the seed is random on each load unless a saved paper is opened.
- Saves live in this browser's localStorage only (`torn-paper:saves`). The printed image is stored as a data URL downscaled to 1024 px; if the quota is exceeded it falls back to JPEG (loses transparency), then to 512 px.

## Tuning tips

- **Looks like sandpaper**: lower *relief*, or reduce the high-frequency term in `height()`.
- **Rim too uniform**: raise *rim irregularity*; the shape of the variation comes from `nA` / `nB` in the shader.
- **Edge too clean**: raise *tear teeth*; hairs are controlled by the `smoothstep(0.52, 0.66, …)` thresholds.
- **Ink looks digital**: raise *ink wear* and *ink bleed*, or use Multiply blending.
