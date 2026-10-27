import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Endless Totem',
  description: 'An endlessly growing totem of masks and heads carved from one ink drawing, stitched along minimum-cost seams so strokes run across the joins.',
  tags: ['ink', 'generative', 'canvas', 'collage'],
  date: '2026-10-27',
  thumbnail,
  notes: 'The totem grows upward on its own. Scroll or drag to travel, click a head to re-carve it. Space pauses, N starts a new totem.',
  mobileNotes: 'Drag to travel, tap a head to re-carve it.',
};

export default meta;
