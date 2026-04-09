# wm

A physics-based DOM window manager — drag with inertia, spring snap, and edge-based tiling.

## What it does

Windows live on a canvas area and are dragged by their titlebars. On release, each window coasts with momentum and decays to rest. When repositioned programmatically (the REPOSITION button), windows spring toward their original positions with natural overshoot and damping. Tilts slightly in the direction of motion while dragging.

Dragging a window onto another reveals a directional zone overlay: the four edge quadrants (25 % each) show a blue highlight for tiling; the center zone shows an amber dashed outline for plain overlap. Dropping on an edge springs the dragged window flush against that side of the target.

## Controls

| Input | Action |
|---|---|
| Drag titlebar | Move window |
| Click minimize (yellow dot) | Collapse window to titlebar |
| Click close (red dot) | Dismiss window |
| Drag onto edge of another | Action depends on Drop Mode (see below) |
| Drag onto center of another | Overlap without action |
| Click pop-out (green dot) | Undock a panel from a docked group |
| `C` | Close all windows |
| `R` | Restart (re-spawn all windows) |
| `P` | Reposition (spring back to original positions) |

## Physics / Algorithm

Each window carries position `(x, y)` and velocity `(vx, vy)`.

**Momentum** — on release, velocity decays each frame:
```
vx *= 0.88;  vy *= 0.88;
x  += vx;    y  += vy;
```

**Spring** — when a target position is set (reposition, tile drop, sticky snap):
```
vx = vx * 0.70 + (tx - x) * 0.13;
vy = vy * 0.70 + (ty - y) * 0.13;
x += vx;  y += vy;
```
Spring terminates when `|v| < 0.12` and `distance < 0.4 px`.

**Tilt** — `rotate(vx * 0.35 deg)` during drag; `rotate(vx * 0.10 deg)` during free motion.

**Boundary bounce** (contain mode) — on edge collision, position is clamped and velocity component is negated with 45 % damping.

### Constants

| Constant | Value | Notes |
|---|---|---|
| `MOMENTUM_DECAY` | 0.88 | Velocity multiplier per frame (~60 fps) |
| `SPRING_K` | 0.13 | Spring stiffness |
| `SPRING_DAMP` | 0.70 | Spring damping (< 1 = under-damped → overshoot) |
| `MAX_TILT` | 7° | Max rotation during drag |
| `SNAP_DIST` | 18 px | Edge proximity for sticky snap |
| `OUTER_GUTTER` | 16 px | Min margin between window and viewport edge |

## Window config

```ts
makeWin({
  id: 'my-win',
  title: 'Title',
  width: 320,            // fixed px; clamped to viewport − gutter
  height: 200,           // omit for auto height; set for fixed + scroll
  position: { x, y },
  showClose: true,       // default true
  showMinimize: true,    // default true
  content: { type: 'markdown', text: '...' },
  // or: { type: 'html', html: '...' }  ← inline <script> tags are executed
  // or: { type: 'image', src: '...', alt: '...' }
});
```

## Toggles

| Toggle | Effect |
|---|---|
| **Sticky** | After release, snaps a window's edges flush to any neighbour within `SNAP_DIST`. Uses spring animation to close the gap. Windows are not merged — each remains independent. |
| **Contain** | Clamps windows inside the viewport on every tick. Velocity component is negated (× 0.45) on collision, producing a soft bounce. |
| **Canvas mode** | `Viewport` — overflow hidden, no scroll. `Infinite ↕ / ↔ / ↕↔` — canvas area expands to 6 000 px in the relevant axis and the desktop becomes scrollable. |
| **Drop mode** | Controls what happens when a window is dropped onto an edge zone of another (see below). |

## Drop modes

### Tile (default)

The dragged window springs to a position flush against the target's edge. Both windows remain fully independent.

### Dock

The dragged window's panel (titlebar + body) is moved into the target window's panel container, creating a **docked group**. The group moves as a single unit. Each panel keeps its own titlebar with minimize and close buttons. A green **pop-out dot** appears in each docked panel's titlebar — clicking it extracts the panel back to a standalone window with a small bounce animation.

Drop zone determines layout:

| Zone | Layout |
|---|---|
| Top / Bottom | Panels stacked vertically (flex column) |
| Left / Right | Panels arranged side by side (flex row) |

Docked panels are excluded from the physics loop — they move with their host. Dragging any titlebar inside a group moves the whole group.

### Merge

The two windows are **permanently combined** into a single new window with one shared titlebar. The original windows are removed. Content from both is placed inside a flex container:

| Drop zone | Content layout |
|---|---|
| Top / Bottom | Stacked vertically |
| Left / Right | Side by side |

The merged window behaves like any other window (draggable, closeable, physics). It cannot be split back.

## Drop-zone detection

Hit-testing is done against `getBoundingClientRect()` of each candidate window, sorted by `z-index` descending so the visually topmost window always wins when windows overlap. The test runs fresh at `pointerup` (using the exact release coordinates) rather than reading a cached value — this avoids stale results when the final `pointermove` fires with the cursor slightly off the target.

Zone thresholds (fraction of window size):

```
left  rx < 0.25    →  tile left
right rx > 0.75    →  tile right
top   ry < 0.25    →  tile above
bot   ry > 0.75    →  tile below
else               →  overlap (center, no tiling)
```

## Resize behaviour

On `window resize`, each window's `(x, y)` and `(origX, origY)` are scaled proportionally by `(newW / oldW, newH / oldH)`. This keeps the relative layout intact at any viewport size; windows may overlap if the viewport shrinks significantly.

## Mobile / touch

`touch-action: none` is set on the titlebar so the browser does not interpret the drag as a scroll gesture and send `pointercancel`. All drag handling uses the Pointer Events API (`pointerdown / pointermove / pointerup / pointercancel`) with `setPointerCapture` on the titlebar element, which works for both mouse and touch without separate touch-event handlers.

## Tuning tips

- **Too floaty**: increase `MOMENTUM_DECAY` toward 0.95.
- **Spring feels stiff / no overshoot**: decrease `SPRING_K` or increase `SPRING_DAMP` toward 0.85.
- **Spring overshoots forever**: decrease `SPRING_DAMP` or increase `SPRING_K`.
- **Tilt too aggressive**: reduce the `0.35` multiplier in `applyTransform`.
- **Sticky snap fires too eagerly**: increase `SNAP_DIST`.
- **Drop zones too sensitive**: widen the center zone by shrinking the edge thresholds (e.g. `0.20` / `0.80`).
