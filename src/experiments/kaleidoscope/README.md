# kaleidoscope

Procedural plasma texture mirrored N times via polar fold, rendered as a full-screen WebGL kaleidoscope.

## What it does

Five lissajous-moving radial gradients are composited in screen mode onto an offscreen 256×256 canvas. That canvas feeds a Three.js `CanvasTexture` which is sampled inside a GLSL fragment shader. The shader converts each output pixel to polar coordinates, folds the angle into one symmetric segment (`2π / N`), and mirrors it — producing a seamless kaleidoscope pattern in real time. Dragging rotates the fold angle. Webcam mode swaps the procedural source for a live video feed.

## Controls

| Input | Action |
|---|---|
| Drag left/right | Rotate the kaleidoscope |
| Segments slider | Number of mirror segments (2–24) |
| Speed slider | Auto-rotation speed |
| Detail slider | Zoom into source texture |
| Preset select | Switch color palette (Aurora / Fire / Nebula) |
| W / WEBCAM button | Toggle live webcam source |

## Algorithm

For each output pixel at screen position `(x, y)`:

```
uv  = (x, y) - 0.5            // center at origin
r   = length(uv * aspect)      // aspect-correct radius
θ   = atan2(uv.y, uv.x) + rot // polar angle + manual rotation
seg = 2π / N
θ   = mod(θ, seg)              // fold into one segment
if θ > seg/2: θ = seg - θ     // mirror
srcPt = (cos θ, sin θ) · r · zoom + 0.5
color = texture(source, fract(srcPt))
```

The circle mask (`r > 0.5 → black`) keeps the pattern inscribed in a circle.

### Constants

| Constant | Default | Notes |
|---|---|---|
| Segments | 17 | Higher = denser symmetry |
| Speed | 0.46 | rad/s auto-rotation |
| Detail | 0.7 | Source zoom; lower = wider pattern |
| Source res | 256×256 | Offscreen canvas for procedural mode |

## Tuning tips

- **Pattern feels too busy**: decrease segments or increase detail.
- **Colors cycle too fast**: reduce `dh` values in the blob presets.
- **Webcam too jittery**: the `VideoTexture` updates every frame — works best with good lighting.
- **Performance**: reduce `renderer.setPixelRatio` cap (currently `min(dpr, 2)`) on low-end devices.
