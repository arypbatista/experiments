import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Ink Erosion',
  description:
    'The ink drawing as a cliff in a storm: driving rain cuts rivulets through the strokes, falling stones blast craters, cut-off fragments collapse, and the debris piles up below in ink-grey strata.',
  tags: ['ink', 'cellular-automata', 'simulation'],
  date: '2026-10-27',
  thumbnail,
  notes:
    'RAIN [1]: hold to blast a water jet. STONES [2]: hold to grow a boulder, release to drop it. F rockfall, G gust of wind, R reset.',
  mobileNotes:
    'Pick RAIN or STONES in the panel. Hold to jet water, or hold and release to drop a stone. Buttons trigger rockfall, gusts and reset.',
};

export default meta;
