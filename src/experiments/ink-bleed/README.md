# ink-bleed

Suminagashi (floating-ink marbling) with the drawing as the floating film: you
deform it and then pull a single print from the water.

## What it does

The ink drawing is floating on a bath of water. It has not been printed yet, so
it can still move. Pull a needle through it and the lines shear into the
feathered points you see in marbled paper. Hold still and a drop lands where you
are: water opens a clear disc and pushes the drawing outward into a ring, and
sumi adds a new black disc. Alternating drops build the concentric rings of
classic suminagashi. Nothing relaxes back, so every gesture stays until you
print.

The drawing is full of hidden faces, and marbling is a machine for making more
of them, because stretched, mirrored, ringed ink is exactly what the eye reads
as a face. So the piece is a pareidolia instrument. The print makes it finite:
**PRINT** lays a sheet on the water. It lifts about three quarters of the ink,
turns over to show a mirror-image monoprint with uneven transfer, and files it
in the stack on the left (click a print to enlarge it). The water keeps only a
grey ghost, which you can keep working into a ghost print, as printmakers do.
**REFLOAT** puts a fresh copy of the drawing on the water.

## Controls

| Input | Action |
|---|---|
| Drag | pull a needle (or comb) through the floating ink |
| Hold still | a drop blooms; the longer you hold, the bigger it gets |
| C | toggle stylus / comb (9 tines) |
| D | cycle drop type: water, sumi, alternate |
| P | lay a sheet and pull a print |
| R | refloat the original drawing |
| Click a print | enlarge it (click or Esc to close) |
| MOTION checkboxes / sliders | switch each autonomous motion on or off and set its strength |
| Space | pause or resume all motion |

## Motion

The bath can keep moving on its own, so the marbling evolves while you watch.
Nothing is scripted: each motion re-randomizes its paths, swirl directions and
timing whenever it is switched on. They all deform the map exactly like your
gestures do, so the image accumulates change and never wobbles back.

| Motion | What moves | Strength controls |
|---|---|---|
| current | one slow circulation of the whole bath, faster near its center (it shears as well as turns) | peak speed, up to 14 px/s |
| eddies | 3 small vortices of random spin wandering over the drawing and twisting it into spirals | peak swirl speed, up to 45 px/s |
| breeze | wind shearing the surface in bands 280 px apart; its direction slowly turns and the bands drift | shear speed, up to 14 px/s |
| rain | drops land at random (exponential gaps) and bloom over 0.6 s; uses the selected drop type | up to 14 drops/min |
| phantom needle | an invisible stylus on a smooth random path that dips in and out of the water | travel speed, up to 160 px/s |

**Default:** only `current` is on, at 0.20. That is about 3 px/s, so the
drawing is still whole after a minute, yet the paper-colored surface clearly
reads as liquid from the start. A real bath never stands perfectly still after
being poured. The rest are opt-in, because they rewrite the drawing fast.

Interaction rules:

- Motion runs alongside your own gestures.
- Motion stops while a print sheet is on the water.
- A print captures whatever state the bath is in.
- REFLOAT resets the image and keeps the toggles.

## Algorithm

Ink is **not** advected as a dye. A dye grid smears a little on every
semi-Lagrangian step, and after a few hundred gestures the drawing would turn to
fog. Instead, a float texture stores a **map**: for each point on the water,
where that bit of film came from in the original drawing. Every gesture is an
exact, area-preserving deformation of the plane, from Jaffer & Lu's
*Mathematical Marbling*. It is applied by composing its inverse into the map:

```
newMap(p) = oldMap(F⁻¹(p))
```

The map is smooth, so bilinear resampling barely degrades it, and the renderer
samples the original high-resolution drawing through it. Lines stay as crisp
as the scan however much they have been stretched.

**Drop** at C with radius r (exact inverse):

```
p = C + (p' − C) · sqrt(1 − r² / |p' − C|²)      (|p' − C| > r)
```

Inside the drop the map holds "no film" (water) or "sumi". A growing drop is a
sequence of small exact drops, because a drop of area A followed by one of area
B at the same center equals a single drop of area A + B.

**Needle** dragged from A to B: a shear along the drag direction M that decays
with the distance d to the needle's path:

```
D(q) = M · |B − A| · exp(−d / λ)
```

It is inverted by fixed-point iteration (`q ← p − D(q)`, 4 steps). The pointer
path is cut into 3 px segments, one GPU pass each. A comb takes the max over 9
parallel tines.

**Water motion** (current + eddies + breeze) is a single stream function. Its
curl is divergence-free, so any combination preserves area:

```
ψ = Σ S·R·e^(−|p−c|²/R²) / 0.858          (current and each eddy; peak speed S)
  + (S/k)·sin(k·n·p + φ)                   (breeze: shear bands along the wind)
u = (∂ψ/∂y, −∂ψ/∂x)                        (central differences in the shader)
```

It is applied as one backtrace pass, `q = p − dt·u((p+q)/2)`. To keep the cost
down, the pass runs only once about 0.6 px of motion has built up (at most every
0.12 s). Slow settings then cost a pass every few frames, and the drop and sumi
masks are resampled as rarely as possible. Rain reuses the drop pass and the
phantom needle reuses the stroke pass. With everything on, a typical frame is
one flow pass, one or two needle passes and the occasional drop.

Two RGBA float targets ping-pong through every pass (MRT):

- `map = (srcX, srcY, film, sumi)`. `film` and `sumi` are presence masks. The
  renderer re-sharpens them with `fwidth`, so drop edges stay one pixel wide
  even after heavy stretching.
- `amt = (amount)` is ink strength. Each print multiplies it by `LIFT`.

The print is made on the CPU from a snapshot of the bath (`print.ts`). The
snapshot is mirrored, mapped onto a warmer paper, multiplied by two smooth
random fields (sheet pressure and sumi pooling), and given a fine fiber grain.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `DROP_RATE` | 70000 | px² of surface added per second while a drop grows |
| `DROP_MAX_R` | 210 | largest drop radius (px) |
| `HOLD_MS` | 160 | stillness before a held pointer starts a drop |
| `STEP` | 3 | needle path segment length (px), one pass each |
| `COMB_TINES` / `COMB_GAP` | 9 / 34 | comb geometry |
| drag (slider) | 14 | λ, the needle's reach into the size (px) |
| `LIFT` | 0.27 | ink left on the water after a print |
| `CURRENT_SPEED`, `EDDY_SPEED`, `BREEZE_SPEED` | 14, 45, 14 | px/s at strength 1 (motion.ts) |
| `RAIN_PER_MIN`, `NEEDLE_SPEED` | 14, 160 | at strength 1 |
| `FLOW_MIN_PX` | 0.6 | displacement accumulated before a flow pass runs |

## Tuning tips

- **Needle feels too local or too sticky**: change the drag slider (λ). Larger
  values pull wide swathes, like a thick size.
- **Drops grow too fast**: lower `DROP_RATE`.
- **Ghost print too faint or too strong**: adjust `LIFT`.
- **Motion too lively at full strength**: lower the `*_SPEED` constants in
  motion.ts, since the sliders only scale them.
- **Drop edges soften after long motion**: raise `FLOW_MIN_PX` to resample the
  masks less often.
- **Slow on large screens**: the map resolution is capped at 1600 px on the
  long side in `simScale()` (bath.ts). Lower the cap, or raise `STEP` to run
  fewer passes per drag.
