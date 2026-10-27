import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Stroke Swarm',
  description: 'Thousands of short strokes, each oriented along the drawing, scatter from the cursor and settle back.',
  tags: ['ink', 'particles', 'canvas'],
  date: '2026-10-27',
  thumbnail,
  notes: 'Move the cursor through the strokes. Click to blow them apart.',
};

export default meta;
