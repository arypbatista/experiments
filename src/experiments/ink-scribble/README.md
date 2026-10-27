# ink-scribble

The ink drawing as a physical material: every stroke becomes a thread you can play, cut, unravel or blow.

## What it does

The drawing is re-traced into roughly a thousand polylines that follow the strokes, each with a width taken from the local ink thickness. A faint ghost of the original sits underneath, so whatever you remove leaves a pale scar. Four modes give the threads a different purpose:

- **Harp**: every thread is a string. Dragging across one plucks it: it vibrates in red and plays a Karplus-Strong note. Long threads ring low, short ones high, thick ones an octave down, all on a minor pentatonic so any strum sounds fine.
- **Scissors**: swipe through threads to snip them. Cut threads lose their anchor, drop under gravity and pile up on the floor. The stat shows how much of the drawing is on the floor.
- **Yarn**: the whole drawing is one continuous yarn (threads are chained in a nearest-neighbour tour). Grab anywhere and pull: tension rips points out of the drawing one after another, the freed yarn hangs from your cursor and its weight pulls more out.
- **Hair**: each stroke is a hair rooted at its upper end. Cursor motion stirs a coarse wind field, holding blows outward, G sends a gust across the drawing. Wind noise follows the field strength.

REWEAVE flies every loose thread back home, bottom-up.

## Controls

| Input | Action |
|---|---|
| 1 / 2 / 3 / 4 or the select | Harp / Scissors / Yarn / Hair |
| Drag | Strum (harp), snip (scissors), pull a grabbed thread (yarn), blow (hair) |
| Mouse move | Stir the air (hair) |
| G | Gust (hair) |
| R | Reweave |
| M | Sound on/off |

## Physics / Algorithm

**Tracing** (`trace.ts`): a chamfer distance transform gives half the stroke thickness at each ink pixel. Seeds are visited in random order; from each uncovered seed the walker picks the longest ink run as its direction and walks both ways in 3 px steps, scoring candidate headings by straightness, distance-to-edge (stay on the centre line) and a coverage penalty. Accepted threads stamp the coverage map with their local width.

**Simulation**: all points live in flat typed arrays in tour order, with invisible link points bridging the gaps between consecutive threads (only active in yarn mode). Verlet integration, per-point anchor springs to the rest pose (stiffness depends on mode), one-sided distance constraints (threads can slack but not stretch), gravity only for released points. Released points settle on a cheap pile: a per-column histogram of fallen points sets the floor height, and each point picks a random depth inside it.

```
yarn: |p - rest| > BREAK  →  point is ripped free
```

### Constants

| Constant | Value | Notes |
|---|---|---|
| `SEG` | 3 | Thread segment length, drawing px |
| `GRAVITY` | 0.22 | For released points, px/frame² |
| `BREAK` | 5 | Yarn: displacement that rips a point out |
| anchor `K` | 1 / 0.08 / 0.35 / 0.05→0.006 | Harp / scissors / yarn / hair (root to tip) |
| `GHOST` | 0.09 | Opacity of the original drawing underneath |

## Tuning tips

- **Yarn unravels too eagerly / too stubbornly**: raise / lower `BREAK`, or the yarn anchor `K` in `configure()`.
- **Hair too stiff**: lower the hair anchor stiffness in `configure()`; wind response is the `* 3` and `0.06` factors in `integrate()`.
- **Too few / too many threads**: `maxPoints` in `traceThreads()`; longer threads with `maxHalf`.
- **Pile too flat**: increase the `* 2.2` factor where `pile[k]` is computed.
- **Strums too loud or muddy**: voice cap and reverb `wet` gain in `audio.ts`.
