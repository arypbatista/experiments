import type { ImageMetadata } from 'astro';

export interface ExperimentMeta {
  title: string;
  description: string;
  thumbnail?: ImageMetadata; // import from co-located thumbnail.jpg in meta.ts
  tags: string[];
  date: string; // ISO date
  hidden?: boolean; // if true, excluded from gallery and routing
  notes?: string;        // instructions or notes shown in the experiment overlay
  mobileNotes?: string;  // overrides notes on mobile; falls back to notes if unset
}

// ExperimentMeta enriched with the slug derived from the folder name
export type ExperimentEntry = ExperimentMeta & { slug: string };
