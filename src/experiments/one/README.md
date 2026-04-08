# one

The Creation of Adam (Michelangelo) rendered as an interactive Three.js point cloud.

## How it works

`creation-of-adam.png` is sampled on a grid (spacing = 7px desktop, 12px mobile). Each dark pixel becomes a 3D point in a flat plane. A WebGL `ShaderMaterial` drives both the point sizing and the bubble effect entirely on the GPU.

### Bubble effect

When the user hovers (desktop) or touches (mobile), a Gaussian falloff is computed in the vertex shader by projecting each point to screen space and comparing it with the spring-smoothed cursor position. Points inside the bubble radius:

1. **Spread** radially outward in world XY from the bubble center
2. **Lift** toward the camera along the view-space ray (not just +Z, to avoid perspective drift)
3. **Grow** slightly in point size

### Spring

The bubble position doesn't follow the cursor directly — it's driven by a spring simulation (`STIFFNESS = 0.04`, `DAMPING = 0.85`) that runs every RAF tick, giving inertia and curved movement on direction changes.

## Key parameters

| Constant | Value | Effect |
|---|---|---|
| `SPACING` | 7 (desktop) / 12 (mobile) | Dot density |
| `BUBBLE_RADIUS` | 60px screen | Area of influence |
| `BUBBLE_Z` | 2.5 world units | Max lift toward camera |
| `BUBBLE_SPREAD` | 0.15 world units | Radial XY spread at peak |
| `camera.position.z` | 4.05 (landscape) / 6.5 (portrait) | Zoom level |

## Source image

`creation-of-adam.png` — black figure on transparent background. The image is composited onto a white canvas before sampling so transparent pixels read as white (luma ≈ 1, brightness ≈ 0) and are excluded. Only pixels with `brightness >= 0.4` become points.

## Notes / mobile notes

Authored in `meta.ts` and rendered automatically by `ExperimentLayout` — do not add hint UI to `index.astro`.
