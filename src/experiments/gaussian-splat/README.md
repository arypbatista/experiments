# gaussian-splat

A minimal 3D Gaussian Splatting renderer written from scratch on top of Three.js — no splat library.

## What it does

A 3D model is stored as hundreds of thousands of semi-transparent, colored 3D gaussians (ellipsoids with soft edges). Every frame each gaussian is projected to a 2D ellipse on screen, and all ellipses are alpha-blended back to front. The default model is a procedural torus knot made of flat discs lying on its surface, with baked lighting and a halo of dust. The other presets stream real captures (sneaker, plush toy, train) from the antimatter15 `splat-data` repo on Hugging Face. You can also drop any `.splat` or 3DGS `.ply` file.

Render modes:

- **Gaussians**: the real thing.
- **Ellipses (2σ)**: outlines each splat's projected footprint, so you can see the anisotropy.
- **Centers**: one dot per gaussian, which shows the underlying point cloud.

## Controls

| Input | Action |
|---|---|
| Drag / scroll / right-drag | Orbit / zoom / pan |
| A | Toggle auto-rotate |
| R | Reset view |
| O | Open a `.splat` / `.ply` file |
| Drop file | Load it |

## Physics / Algorithm

Each gaussian has a center `μ`, a 3×3 covariance `Σ = R S Sᵀ Rᵀ` (built from per-axis scale and a quaternion), and an RGBA color.

**Projection (EWA splatting).** In the vertex shader, with `t` the center in view space and `d = -t.z`:

```
J  = [ fx/d   0     fx·t.x/d² ]
     [ 0      fy/d  fy·t.y/d² ]
Σ' = J W Σ Wᵀ Jᵀ          (W = rotation part of modelView)
```

`Σ'` is the 2D covariance in pixels. Adding `0.3` to its diagonal acts as a low-pass filter. Its eigenvectors and eigenvalues give the ellipse axes. An instanced quad is stretched to ±3σ along those axes, and the fragment shader evaluates `α · exp(-½ r²)`.

**Sorting.** Blending only works back to front. A Web Worker computes the view depth of every center and runs a 16-bit counting sort (O(n)). It then posts back an index order, which feeds an instanced `uint` attribute. A new sort runs only when the view direction or distance has changed noticeably.

**Data layout.** Splat data lives in textures 2048 wide (RGBA32F centers, RGBA32F + RG32F covariance, RGBA8 color), read with `texelFetch(splatIndex)`. The 2048×2048 texture size caps the viewer at about 4.2M splats.

**File formats.**
- `.splat`: 32 bytes per splat: `pos f32×3 · scale f32×3 · rgba u8×4 · quat u8×4`.
- `.ply` (3DGS trainer output): `f_dc` → color via the SH band-0 constant `0.2821`, `opacity` → sigmoid, `scale_*` → exp. View-dependent SH bands (`f_rest_*`) are ignored.

Both formats use OpenCV axes (y down), so loaded models are rotated 180° around X.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `TEX_W` | 2048 | Data texture width; max splats = `TEX_W²` |
| low-pass | 0.3 px² | Added to the 2D covariance diagonal |
| quad extent | 3σ | Fragments beyond `r² > 9` are discarded |
| pixel ratio cap | 1.5 | Splatting is fill-rate bound |

## Tuning tips

- **Slow on big scenes**: lower the pixel ratio cap, or shrink the quad extent from 3σ to 2.5σ.
- **Popping while orbiting**: lower the re-sort threshold in `maybeSort` (`0.002`).
- **Knot looks grainy / holes**: raise `count` in `proceduralKnot`, or the `0.75` factor on `sigmaT`.
- **Loaded model is upside down**: that file is not in OpenCV axes. Remove the `yDown` flip for it.
