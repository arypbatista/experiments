import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Scribble Field',
  description: 'The ink drawing re-traced as ~1000 physical threads you can strum like a harp, snip with scissors, unravel like knitting or blow like hair.',
  tags: ['ink', 'verlet', 'physics', 'audio', 'canvas'],
  date: '2026-10-27',
  thumbnail,
  notes: '1 Harp: drag across to strum. 2 Scissors: swipe to snip. 3 Yarn: grab and pull to unravel. 4 Hair: move or hold to blow, G for a gust. R reweaves the drawing, M toggles sound.',
  mobileNotes: 'Pick a mode top-right. Harp: drag to strum. Scissors: swipe to snip. Yarn: grab and pull. Hair: hold to blow. REWEAVE puts it back.',
};

export default meta;
