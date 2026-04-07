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
│       └── index.astro           # experiment content (no layout, no page)
├── layouts/
│   ├── BaseLayout.astro          # base HTML for gallery
│   └── ExperimentLayout.astro    # full-viewport wrapper with ← back nav
├── components/
│   ├── Sidebar.astro             # fixed left sidebar with tag filters
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
  // thumbnail: '/thumbnails/my-experiment.png', // optional
};

export default meta;
```

3. Add `index.astro` with the experiment content — no layout needed, just the content:

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

Thumbnails go in `public/thumbnails/<slug>.png`.

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
