export interface ExperimentMeta {
  slug: string;
  title: string;
  description: string;
  thumbnail?: string; // path relative to /public, e.g. /thumbnails/hello-world.png
  tags: string[];
  date: string; // ISO date
}

export const experiments: ExperimentMeta[] = [
  {
    slug: 'hello-world',
    title: 'Hello World',
    description: 'Drifting particles across a dark canvas.',
    tags: ['canvas', 'animation'],
    date: '2026-04-07',
  },
];
