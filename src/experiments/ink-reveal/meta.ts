import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Ink Reveal',
  description:
    'The ink drawing grows in like roots: several root systems spread along the strokes at once, forking and probing, leaving thin tendrils that slowly thicken and darken into the full drawing.',
  tags: ['ink', 'canvas', 'animation', 'generative'],
  date: '2026-10-27',
  thumbnail,
  notes:
    'Several root systems grow at once. Click the ink to plant another one. Presets and sliders change how they spread. R restarts, Space pauses.',
  mobileNotes: 'Tap the ink to plant another root system. Use RESTART to grow it again.',
};

export default meta;
