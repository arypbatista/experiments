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
│       ├── thumbnail.jpg         # optional screenshot, imported in meta.ts
│       └── index.astro           # experiment content (no layout, no page)
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

## Dev

```bash
pnpm dev
```

Requires Node >= 22.12.0 (Astro 6 constraint).
