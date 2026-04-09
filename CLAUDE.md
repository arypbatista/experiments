# experiments

A personal creative coding gallery. Each experiment is an isolated, full-page canvas piece exploring animation, generative art, and interactive graphics on the web.

## Stack

- [Astro](https://astro.build) — static site generator, zero JS by default
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- TypeScript

## Structure

```
docs/
└── how-it-works.md               # project structure and experiment conventions explained
src/
├── experiments/
│   ├── types.ts                  # ExperimentMeta + ExperimentEntry types
│   └── <slug>/
│       ├── meta.ts               # title, description, tags, date, thumbnail?
│       ├── thumbnail.jpg         # optional screenshot, imported in meta.ts
│       ├── index.astro           # experiment content (no layout, no page)
│       └── README.md             # optional: physics, controls, tuning notes
├── layouts/
│   ├── BaseLayout.astro          # base HTML shell (head, global CSS)
│   └── ExperimentLayout.astro    # full-viewport wrapper: ← back nav + title/tags overlay
├── components/
│   ├── Sidebar.astro             # fixed left sidebar with tag filters + social links
│   └── ExperimentCard.astro      # thumbnail card used in the gallery grid
└── pages/
    ├── index.astro               # gallery: auto-discovers all experiments via glob
    └── experiments/
        └── [slug].astro          # dynamic route: wraps experiment in ExperimentLayout
```

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

A `README.md` inside the experiment folder is optional but encouraged for any experiment with non-trivial logic. It is the right place for anything too detailed for `description` or `notes` in `meta.ts`: physics constants, control schemes, algorithmic decisions, tuning tips.

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

Keep it short. Not every section is required — a simple particle effect may only need "What it does" and "Tuning tips". The goal is that someone (including future-you) can understand the experiment's design decisions without reading all the code.

### Thumbnails

Thumbnails are optional. To add one, place a `thumbnail.jpg` next to the experiment and import it in `meta.ts`:

```ts
import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.jpg';

const meta: ExperimentMeta = {
  title: 'My Experiment',
  description: 'One sentence about what this does.',
  tags: ['canvas'],
  date: '2026-04-07',
  thumbnail,
};

export default meta;
```

Astro processes the imported image at build time (`ImageMetadata`). Without a thumbnail, the gallery card shows a deterministic dark placeholder color derived from the slug.

### Notes

`notes` shows an overlay panel in the bottom-left corner of the experiment with a title and a close button. Use it for instructions or controls. `mobileNotes` overrides the text on touch devices; if omitted, `notes` is shown on all devices.

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

The sidebar lists all unique tags across experiments. Clicking a tag dims cards that don't match. Multiple tags use OR logic — a card is visible if it matches any active tag.

## Environment variables

See `.env.example`. Copy to `.env` and fill in:

```
GITHUB_URL=
LINKEDIN_URL=
```

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

Use `window.matchMedia('(pointer: coarse)').matches` to detect touch devices — not `navigator.userAgent`. For zoom, detect portrait orientation with `window.innerHeight > window.innerWidth` and adjust the camera accordingly.

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
pnpm dev
```

Requires Node >= 22.12.0 (Astro 6 constraint).
