export interface ExperimentMeta {
  title: string;
  description: string;
  thumbnail?: string; // path relative to /public, e.g. /thumbnails/hello-world.png
  tags: string[];
  date: string; // ISO date
}

// ExperimentMeta enriched with the slug derived from the folder name
export type ExperimentEntry = ExperimentMeta & { slug: string };
