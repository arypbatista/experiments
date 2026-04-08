# How it works

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

## Experiments

Each experiment lives in `src/experiments/<slug>/` and consists of two files:

**`meta.ts`** — metadata exported as a default `ExperimentMeta` object:

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

**`index.astro`** — the full-page content. No layout needed; `ExperimentLayout` is applied automatically by `[slug].astro`:

```astro
---
// imports
---

<canvas id="canvas" style="display:block;width:100%;height:100%;"></canvas>

<script>
  // experiment code
</script>
```

The gallery and routing are driven by an Astro glob import — no registration needed.

## Thumbnails

Optional. Import a `thumbnail.jpg` in `meta.ts` and Astro processes it at build time. Without one, the gallery card shows a deterministic dark placeholder color derived from the slug.

## Tag filtering

The sidebar lists all unique tags across experiments. Clicking a tag dims non-matching cards. Multiple tags use OR logic.
