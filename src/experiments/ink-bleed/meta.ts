import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Floating Ink',
  description:
    'Suminagashi: the drawing floats on water. Drag needles and drop water through it until new faces surface, then pull a one-off print that takes the ink with it. Optional currents, eddies, wind, rain and a phantom needle keep the bath evolving on its own.',
  tags: ['ink', 'simulation', 'webgl', 'marbling'],
  date: '2026-10-27',
  thumbnail,
  notes:
    'The drawing is floating on water. Drag to pull a needle through it, hold still to let a drop bloom. C switches to a comb, D changes the drop. P lays a sheet and pulls a print (it takes the ink). R refloats the drawing. MOTION lets the water move on its own (current, eddies, breeze, rain, phantom needle); Space pauses it.',
  mobileNotes:
    'The drawing is floating on water. Drag to pull a needle through it, hold still to let a drop bloom. A slow current keeps turning the bath. PRINT pulls a one-off print, REFLOAT starts again.',
};

export default meta;
