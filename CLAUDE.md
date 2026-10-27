# experiments

A personal creative coding gallery. Each experiment is an isolated, full-page canvas piece exploring animation, generative art, and interactive graphics on the web.

## Stack

- [Astro](https://astro.build) — static site generator, zero JS by default
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- TypeScript

## Structure

```
src/
├── experiments/
│   ├── types.ts                  # ExperimentMeta + ExperimentEntry types
│   └── <slug>/
│       ├── meta.ts               # title, description, tags, date, thumbnail?
│       ├── thumbnail.png         # optional screenshot, imported in meta.ts
│       ├── index.astro           # experiment content (no layout, no page)
│       └── README.md             # optional, shown to visitors via the README.md button
├── layouts/
│   ├── BaseLayout.astro          # base HTML shell (head, global CSS)
│   └── ExperimentLayout.astro    # full-viewport wrapper: nav, notes panel, README modal
├── components/
│   ├── Sidebar.astro             # fixed left sidebar with tag filters + social links
│   └── ExperimentCard.astro      # thumbnail card used in the gallery grid
└── pages/
    ├── index.astro               # gallery: auto-discovers all experiments via glob
    └── experiments/
        └── [slug].astro          # dynamic route: wraps experiment in ExperimentLayout, loads README.md raw
```

`.claude/skills/` has project skills: `threejs-*` (Three.js reference) and `git-commit`. `pnpm-workspace.yaml` holds `allowBuilds` for esbuild and sharp — pnpm needs it to run their build scripts.

## Adding an experiment

1. Create a folder `src/experiments/<slug>/`
2. Add `meta.ts` exporting a default `ExperimentMeta` object:

```ts
import type { ExperimentMeta } from '../types';

const meta: ExperimentMeta = {
  title: 'My Experiment',
  description: 'One sentence about what this does.',
  tags: ['canvas', 'three.js'],
  date: '2026-04-07',
};

export default meta;
```

`date` is an ISO date or datetime (`'2026-04-07T23:16:18'`). The gallery sorts by plain string compare, newest first — use a datetime to order experiments made the same day.

3. Add `index.astro` with the experiment content — no layout needed, ExperimentLayout is applied automatically by `[slug].astro`:

```astro
---
// import whatever you need (Three.js, GSAP, P5, etc.)
---

<canvas id="canvas" style="display:block;width:100%;height:100%;"></canvas>

<script>
  // experiment code
</script>
```

The gallery and routing pick it up automatically — no registration needed.

### README

A `README.md` inside the experiment folder is optional but expected for any experiment with non-trivial logic (custom shaders, physics, algorithms). It is **public**: `[slug].astro` imports it raw and the layout renders it in a modal behind a "README.md" button, so write it for a curious visitor, not as private notes. It is the right place for anything too detailed for `description` or `notes` in `meta.ts`: physics constants, control schemes, algorithmic decisions, tuning tips.

**Structure** — use these sections as needed, in this order:

```markdown
# <slug>

One sentence: what technique or idea this experiment explores.

## What it does

Plain-language description of what's on screen and how the simulation/animation works. No code — just what a curious reader would want to know before looking at the source.

## Controls

| Input | Action |
|---|---|
| Click + drag | ... |
| A / D | ... |

Omit this section if there are no interactive controls.

## Physics / Algorithm

The core math or algorithm, explained briefly. Include the key formula if there is one:

```
ax = G * M * (body.x - ship.x) / r³
```

Sub-sections for constants (as a table) if the experiment has tunable values:

### Constants

| Constant | Value | Notes |
|---|---|---|
| `G` | 1 | Scaled gravitational constant |

## Tuning tips

Bullet list of "if X then adjust Y" notes — useful when revisiting the experiment after time away.

- **Effect too strong**: decrease `CONSTANT`.
- **Animation feels slow**: increase `SPEED`.
```

Two optional sections that pay off for complex pieces (see `torn-paper`): **Design decisions** (what was tried and dropped, and why) and **Known limitations**. Keep the README in sync with the code — stale constants are worse than none.

Keep it short. Not every section is required — a simple particle effect may only need "What it does" and "Tuning tips". The goal is that someone (including future-you) can understand the experiment's design decisions without reading all the code.

### Thumbnails

Thumbnails are optional but every published experiment has one. To add one, place a `thumbnail.png` (the repo convention; `.jpg` also works) next to the experiment and import it in `meta.ts`:

```ts
import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'My Experiment',
  description: 'One sentence about what this does.',
  tags: ['canvas'],
  date: '2026-04-07',
  thumbnail,
};

export default meta;
```

Astro processes the imported image at build time (`ImageMetadata`). Use a 4:3 crop (cards are 4:3, `object-fit: cover`) around 640×480, under ~1 MB — the card serves the file as-is, unoptimized. Editors with an EXPORT PNG action can produce their own. Without a thumbnail, the gallery card shows a deterministic dark placeholder color derived from the slug.

### Notes

`notes` shows an overlay panel in the bottom-left corner of the experiment with a title and a close button. Use it for instructions or controls. `mobileNotes` overrides the text on touch devices; if omitted, `notes` is shown on all devices — so add `mobileNotes` whenever `notes` says "click", "hover", "scroll" or names keys. Keep notes to the essential gestures (2–3 sentences); the full control table belongs in the README. Notes must only describe controls that exist.

```ts
const meta: ExperimentMeta = {
  // ...
  notes: 'Click and drag to interact. Press R to reset.',
  mobileNotes: 'Tap and drag to interact.',
};
```

### Hiding an experiment

Set `hidden: true` in `meta.ts` to exclude an experiment from the gallery and disable its route:

```ts
const meta: ExperimentMeta = {
  // ...
  hidden: true,
};
```

## Tag filtering

The sidebar lists all unique tags across experiments, plus a Fuse.js search over title and tags. Clicking a tag hides cards that don't match. Multiple tags use OR logic — a card is visible if it matches any active tag.

## Environment variables

See `.env.example`. Copy to `.env` and fill in:

```
GITHUB_URL=
LINKEDIN_URL=
```

## Best practices

Distilled from the existing experiments. Reference implementations: **`torn-paper` / `xul-hills`** for editors (WebGL2 + SVG handles + panel + persistence + export), **`space`** for simulations (dt sub-stepping, presets, action buttons), **`fluid`** / **`orbits`** for CPU performance (preallocated typed arrays).

### Concept

- **One idea per experiment.** A clear question ("what does torn paper look like?", "N-body slingshot") beats a pile of features.
- **Data over code.** Describe variants as tables (materials in `sand`, shapes in `cloth`, palettes in `xul-hills`) so adding one doesn't touch logic.
- **Editors work in a fixed design space** (e.g. 1000×700, y up or down — pick one and document it). The stage is aspect-fitted into the available area, handles live in an SVG overlay with the same `viewBox`, and hit-testing happens in design units. Resize and DPR then never touch the model.

### Render loop and time

- **Simulations:** continuous `requestAnimationFrame` with real, clamped dt: `dt = Math.min((now - last) / 1000, 0.05)`. Integrate with dt (sub-step when stiff: `space` uses 8 Euler sub-steps). Per-frame constants (`vel *= 0.88`) make speed depend on refresh rate — 120 Hz screens run twice as fast.
- **Static / editor pieces:** render on demand. Keep a dirty flag and request a single frame when something changes; only rebuild expensive intermediates (an SDF, a data texture) when their inputs changed.
- **DPR:** always handle it, capped at 2: `Math.min(window.devicePixelRatio || 1, 2)`. Canvas2D: backing store `W*dpr`, `ctx.setTransform(dpr,0,0,dpr,0,0)`, physics in CSS px. Three.js: `renderer.setPixelRatio(...)`; scale `gl_PointSize` by the ratio. Exception: deliberately low-res grids upscaled by CSS (`fluid`, `sand` with `image-rendering: pixelated`).
- **No allocation in hot loops.** Preallocate typed arrays and scratch buffers; no closures, `Object.assign` or `new Vector3` per element per frame. Cap anything users can spawn (`MAX_SHAPES`, `MAX_BODIES`) and make the cap match the buffers.
- **Seeded randomness** (`mulberry32`) when a result should be reproducible or re-rollable (RETEAR / reseed).
- **Resize keeps state** where possible (`sand` copies the overlapping grid) instead of resetting.
- **Dispose what you rebuild.** Page navigation cleans up everything, but rebuilding inside the experiment (changing particle count, swapping renderers) must dispose geometries, materials, render targets / `GPUComputationRenderer`, cancel timers, and stop media tracks (`getUserMedia`) + close `AudioContext`.

### Input

- **Pointer Events only**: `pointerdown` on the drag surface, `setPointerCapture`, `pointermove` / `pointerup` / `pointercancel`, and `touch-action: none` on that surface. One code path for mouse, pen and touch; drags never get stuck when released outside.
- Don't `preventDefault` touch events on `window` — it can swallow taps on the layout's nav and notes. Scope touch handling to the canvas.
- **Every action button has a key, every key has a button** (or is listed in the README). The keydown handler ignores focused form controls:

```ts
window.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
  // ...
});
```

- Panels should not leak pointer events into the scene (`stopPropagation` on the panel when the canvas listens on `window`).
- Conversions screen → scene must include camera zoom and offset (bug fixed in `space`).

### UI

- One panel style: the bare column described in **In-experiment UI controls** below (no background card). Parameters top-right, **action buttons always bottom-right** — not inside the parameter panel.
- Booleans are checkboxes (`accent-color: white`), not 0–1 sliders.
- Generate slider wiring from a table (`SLIDERS` in torn-paper, `STYLE_FMT` in xul-hills) instead of one handler per slider. For expensive params, update the label on `input` and rebuild on `change`.
- Tints: red for destructive (CLEAR / DELETE), yellow for export or the special action, `.on` state for toggle buttons.
- A scoped `<style is:global>` block with a short per-experiment prefix (`tp-`, `xh-`) is fine once inline styles get repetitive.
- Panel subtitles describe what the controls do — not how to use the experiment (that's `notes`).
- Show errors in the page, not only the console: WebGL2 unsupported, shader compile/link failure, failed fetch / image load, storage full, camera denied (`kaleidoscope` shows "NO CAM").

**Editor layout** (torn-paper, xul-hills): fixed `#area` (`top:48px; left:24px; right:272px; bottom:72px`) containing an aspect-fitted stage (canvas + SVG overlay), 224px scrollable panel at 64/24, actions bottom-right. At `@media (max-width: 800px)` the panel becomes a bottom sheet (`max-height: 38vh`) and the area shrinks above it.

**Mobile:** use `(pointer: coarse)` for *behaviour* (touch wording, bigger hit targets, sampling density) and width media queries for *layout*. Every panel needs a mobile answer: bottom sheet, hidden non-essential controls, or a camera shift.

### Persistence and export

- localStorage key `<slug>:<what>:v<N>` (e.g. `xul-hills:v4`); bump the version when the stored shape changes. Wrap every read/write in try/catch and fall back to defaults; validate what you load.
- PNG export: render at a fixed larger size (or 2×), `canvas.toBlob` → object URL → `<a download>` → revoke after a delay. WebGL needs `preserveDrawingBuffer: true` (or render and read in the same task).

### WebGL2 without Three.js

Full-screen triangle (`[-1,-1, 3,-1, -1,3]`), shaders compiled with an error path that reaches the page, uniform locations cached. Pass per-column / per-item data as a float texture (`RGBA32F` + `NEAREST` + `texelFetch`; `RGBA16F` if you need linear filtering). `EXT_color_buffer_float` is required to render into float targets.

## Gotchas

### `define:vars` disables npm imports in scripts

Adding `define:vars` to a `<script>` tag turns it into an inline script — Vite no longer processes it, so `import` from npm packages silently fails. Instead, pass build-time values via `data-*` attributes on a DOM element and read them in a plain `<script>`:

```astro
---
const value = 'hello';
---
<canvas id="c" data-value={value}></canvas>

<script>
  import { something } from 'some-package'; // works — no define:vars
  const value = (document.getElementById('c') as HTMLCanvasElement).dataset.value;
</script>
```

### Notes and mobileNotes are layout responsibilities

Do not add hint overlays or instruction UI inside `index.astro`. Author `notes` and `mobileNotes` in `meta.ts` — `ExperimentLayout` renders the panel automatically with a close button and mobile awareness.

### Transparent PNG sampling on offscreen canvas

When reading pixel data from a PNG with a transparent background, transparent pixels read as `rgba(0,0,0,0)` — luma=0, brightness=1 — which can flood a dot-grid with false positives. Always composite onto white before sampling:

```ts
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, img.width, img.height);
ctx.drawImage(img, 0, 0);
```

### Spring animation: integrate inside the render loop

Don't use an animation library's own RAF loop for spring physics when you already have a render loop — running two loops creates a race where the spring value is replaced before the frame renders. Instead, step the spring manually inside `requestAnimationFrame`:

```ts
function tickSpring() {
  velX += (targetX - springX) * STIFFNESS;
  velX *= DAMPING;
  springX += velX;
  // same for Y
}

function draw(t) {
  tickSpring();
  // use springX, springY
  requestAnimationFrame(draw);
}
```

### Mobile detection

Use `window.matchMedia('(pointer: coarse)').matches` to detect touch devices — not `navigator.userAgent`, and not screen size. For zoom, detect portrait orientation with `window.innerHeight > window.innerWidth` and adjust the camera accordingly. Panel *layout* is the exception: use a width media query (see **Editor layout**).

### `pnpm dev` can serve stale markup

After editing an experiment's HTML, the dev server sometimes hot-reloads the `<script>` but keeps serving the old markup. The new script then looks up elements that aren't there, throws on `null.addEventListener`, and the canvas stays blank. Restart `pnpm dev` before debugging a blank page, and don't let a missing optional control kill the experiment (`$(id)?.addEventListener`).

### Esc is shared with the layout

`ExperimentLayout` closes the README modal on Esc, so an experiment's own Esc binding fires at the same time. Fine for "deselect / cancel"; don't bind anything destructive to Esc.

### Wrong-looking output in headless screenshots

Headless Chrome defaults to SwiftShader, which compiles shaders that a real GPU may reject (and vice versa). Verify WebGL work with `--use-angle=metal` too.

### In-experiment UI controls (overlays)

When an experiment needs in-canvas controls (sliders, selects, buttons), overlay them with `position:fixed` — not `position:absolute`. Fixed positioning keeps controls anchored to the viewport regardless of scroll or canvas transforms.

**Panel positions:**

- **Top-right** (parameter panel — sliders, selects, presets): `top: 64px; right: 24px` — clears the back button and title overlay.
- **Bottom-right** (action buttons): `bottom: 24px; right: 24px`.

**Action buttons** — transparent, bordered, monospace, ALL CAPS with keyboard shortcut in brackets:

```html
<div style="position:fixed;bottom:24px;right:24px;display:flex;gap:8px;">
  <button
    id="launch-btn"
    style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:rgba(255,255,255,0.7);font-family:monospace;font-size:12px;padding:6px 14px;cursor:pointer;letter-spacing:0.08em;"
  >LAUNCH [L]</button>
  <button
    id="burn-btn"
    style="background:transparent;border:1px solid rgba(255,255,0,0.5);color:rgba(255,255,0,0.8);font-family:monospace;font-size:12px;padding:6px 14px;cursor:pointer;letter-spacing:0.08em;"
  >BURN [B]</button>
</div>
```

Use a tinted border/color to distinguish destructive or special actions (e.g. yellow for burn/boost). Always wire both the button click and the keyboard shortcut:

```ts
document.getElementById('launch-btn')!.addEventListener('click', launch);
window.addEventListener('keydown', (e) => {
  if (e.key === 'l' || e.key === 'L') launch();
});
```

**Parameter panel** — column of labeled sliders and selects:

```html
<div
  id="controls"
  style="position:fixed;top:64px;right:24px;font-family:monospace;font-size:11px;color:rgba(255,255,255,0.7);display:flex;flex-direction:column;gap:8px;min-width:200px;"
>
  <!-- Section header -->
  <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:2px;">
    <span style="font-size:12px;color:rgba(255,255,255,0.9);letter-spacing:0.06em;">SECTION TITLE</span>
    <span style="font-size:10px;color:rgba(255,255,255,0.4);line-height:1.4;">one-line description of what these parameters control</span>
  </div>

  <!-- Preset select -->
  <select
    id="preset-select"
    style="background:#000;border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.8);font-family:monospace;font-size:11px;padding:4px 6px;cursor:pointer;width:100%;"
  >
    <option value="a">Preset A</option>
    <option value="b" selected>Preset B</option>
    <option value="custom">Custom</option>
  </select>

  <!-- Labeled slider (label shows live value) -->
  <label style="display:flex;flex-direction:column;gap:3px;">
    <span id="speed-label">speed: 1.05</span>
    <input id="speed-range" type="range" min="0.5" max="2" step="0.01" value="1.05"
      style="accent-color:white;width:100%;" />
  </label>
</div>
```

**Slider value labels** always show the current value inline (e.g. `speed: 1.05`). Update the label on every `input` event:

```ts
const speedRange = document.getElementById('speed-range') as HTMLInputElement;
const speedLabel = document.getElementById('speed-label')!;
speedRange.addEventListener('input', () => {
  myParam = parseFloat(speedRange.value);
  speedLabel.textContent = `speed: ${myParam.toFixed(2)}`;
  presetSelect.value = 'custom'; // switch to Custom when manually adjusted
});
```

**Preset + custom pattern** — presets populate all slider values at once; any manual slider change switches the select to `"custom"`:

```ts
const PRESETS: Record<string, [number, number]> = {
  a: [0.8, 10],
  b: [1.05, 20],
};

function applyValues(speed: number, count: number) {
  mySpeed = speed; myCount = count;
  speedRange.value = speed.toFixed(2);
  speedLabel.textContent = `speed: ${speed.toFixed(2)}`;
  countRange.value = String(count);
  countLabel.textContent = `count: ${count}`;
}

presetSelect.addEventListener('change', () => {
  const preset = PRESETS[presetSelect.value];
  if (preset) applyValues(preset[0], preset[1]);
});
```

**Conditional parameter rows** — show or hide rows based on the active preset using `style.display`:

```ts
function updateRowVisibility() {
  const isModeA = presetSelect.value === 'a';
  (document.getElementById('row-a')! as HTMLElement).style.display = isModeA ? 'flex' : 'none';
  (document.getElementById('row-b')! as HTMLElement).style.display = isModeA ? 'none' : 'flex';
}
presetSelect.addEventListener('change', updateRowVisibility);
updateRowVisibility(); // call once on init
```

**Mobile:** these panels may overlap scene content on small screens. Either hide non-essential controls (`display:none` when `window.matchMedia('(pointer: coarse)').matches`) or reduce their size. If the top-right panel obscures the scene, shift the camera down to compensate (`camera.position.y`).

### Three.js 2D scene (OrthographicCamera)

For 2D canvas experiments using Three.js, set up an OrthographicCamera where scene units equal pixels and the origin is at the center of the screen:

```ts
const W = window.innerWidth, H = window.innerHeight;
const camera = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, 0.1, 1000);
camera.position.z = 10;

function onResize() {
  const W = window.innerWidth, H = window.innerHeight;
  renderer.setSize(W, H);
  camera.left = -W/2; camera.right = W/2;
  camera.top = H/2; camera.bottom = -H/2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
```

To zoom out on mobile without changing the scene, set `camera.zoom = 0.5` and call `camera.updateProjectionMatrix()`. To shift the viewport (e.g. make room for a top UI panel), set `camera.position.y`.

## Dev

```bash
pnpm dev       # http://localhost:4321
pnpm build
pnpm preview
```

Requires Node >= 22.12.0 (Astro 6 constraint).

## Verifying changes

There are no tests or linters. A change is verified when:

1. `pnpm build` passes.
2. The page renders without console errors. Serve the build on a spare port (leave 4321 to the user's dev server) and screenshot it with headless Chrome, then look at the image:

```bash
pnpm preview --port 4391 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --use-angle=metal --enable-logging=stderr --v=0 --user-data-dir="$TMPDIR/chr" \
  --window-size=1500,1000 --virtual-time-budget=6000 \
  --screenshot="$TMPDIR/shot.png" http://localhost:4391/experiments/<slug>/ 2>&1 | grep CONSOLE
```

Add `--force-device-scale-factor=2` to check DPR handling, and `--window-size=390,844` for the mobile layout. Interaction (drag, touch, mic, camera) can't be checked this way — say so instead of claiming it works. Stop the preview server you started.

## Git

Conventional commits with the experiment slug as scope: `feat(torn-paper): add torn paper shader experiment`, `fix(dot-mesh,fractal): wire existing thumbnails in meta`. Plain messages — no `Co-Authored-By` or AI attribution trailers.
