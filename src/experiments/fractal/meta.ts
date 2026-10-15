import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Fractal Tree',
  description: 'Recursive binary tree that deploys as the cursor moves away from the root.',
  tags: ['p5.js', 'generative', 'canvas'],
  date: '2026-04-16',
  thumbnail,
  notes: 'Move cursor away from the tree root to deploy branches. Closer = collapsed, farther = fully open.',
};

export default meta;
