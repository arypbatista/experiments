# ink-pareidolia

A drawing hidden under paper: uncovering it wakes up the faces in the scribbles, and they open eyes drawn in the same ink.

## What it does

The page and the drawing share one paper colour, so there is no visible edge. A paper fog covers the drawing (a faint ghost shows through). The cursor wipes it away with a dry-brush-edged stamp, and the fog slowly settles back, leaving a fading trail.

Hand-picked faces (`FACES`, in drawing pixels) wake up when uncovered, and the two eyes of a face never match. They differ in size, in height, and in how far they open: one may stay shut, open only a crack, or open unnaturally wide. Each eye also has its own pupil: a pinprick, a dilated dark mass, a void with only a sliver of white, or a slit. There are no catchlights. The sockets are sunk in hatched shadow, and the whites are grimy.

The eyes open slowly. They blink rarely and slowly, out of sync with each other. They follow the cursor with lag and a tremor, and sometimes snap onto it. If you stay near a face for 3 s, it fixates: when the paper settles back, its eyes keep staring up through the fog and fade over about 20 s. Three tiny "crack" eyes open inside the heavy ink masses where there is no face.

## Controls

| Input | Action |
|---|---|
| Move / drag | Wipe the paper fog away; staying near a face makes it fixate |
| D | Debug view: fog off, all faces awake, eye sites circled; click logs drawing coords |

## Algorithm

- **Eyes** (`eyes.ts`): lids are brush ribbons along a lopsided parametric opening. Width varies with pressure noise, and each edge wobbles separately with per-sample jag. Sockets are clipped hatch fields: a brow shadow and a cross-hatched pouch under the outer corner. The sclera gets faint scratches and a heavy shadow under the lid. The pupil kind is set per eye in `FACES`.
- **Boil**: eye state advances at 12 fps, and the contour jitter seed cycles through 3 variants. Each frame is stable, but the line shimmers like hand-drawn cels.
- **Fog**: an alpha mask. Each frame, a ragged stamp (paper-tooth value noise plus radial streaks) is cut out with `destination-out`. It regrows in coarse steps, because tiny per-frame alphas stall in 8-bit. Every frame it is re-tinted with exact paper colour before compositing.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `LIGHT_FRACTION` | 0.2 | wipe radius / min(W, H) |
| `FOG_MAX` | 0.95 | 1 = drawing fully hidden when unlit |
| `FOG_REGROW` / `FOG_STEP` | 0.05 / 0.09 s | how fast the paper settles back |
| `WIPE` | 0.28 | how hard the cursor clears per frame |
| `EYE_FPS` | 12 | eye animation / boil rate |
| `WAKE_HOLD` | 2.5 s | how long a face stays awake after being covered |
| `FIXATE_AFTER` / `FIXATED_FADE` | 3 s / 0.045 per s | lingering makes a face stare through the fog |
| `BLINK` / `BLINK_GAP` | 1.1 s / 9–22 s | slow, rare, per-eye blinks |

## Tuning tips

- **Trail lingers too long**: raise `FOG_REGROW` or lower `FOG_STEP`.
- **Ghost too visible**: raise `FOG_MAX`. The trail of a regrown area stays a touch darker, because the 8-bit stall caps regrowth at about 96%.
- **Eyes in the wrong spot**: press D, click the spot, and paste the logged coords into `FACES`.
- **Screenshots**: `#warm=x,y;x,y` pre-simulates the light dwelling at drawing coords, and `#debug` opens in debug view. Headless Chrome barely ticks rAF.
