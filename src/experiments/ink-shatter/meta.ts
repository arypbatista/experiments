import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Ink Shatter',
  description: 'The drawing cracks along wandering seams, lifts into a slow orbiting column of weightless fragments shedding ink ash, then glides home and heals.',
  tags: ['ink', 'voronoi', 'animation', 'canvas'],
  date: '2026-10-27',
  thumbnail,
  notes: 'Click to wake the drawing: it cracks open from that point and its pieces rise. Hold to keep them suspended, release to let them return. Move the cursor through the floating pieces to stir them.',
  mobileNotes: 'Tap to wake the drawing; touch and hold to keep the pieces suspended. Drag through them to stir.',
};

export default meta;
