import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Torn Paper',
  description: 'Editable polygon rendered as torn paper by a WebGL2 shader — jagged white core, fibers, relief and printed ink.',
  tags: ['webgl', 'shader', 'generative', 'editor'],
  date: '2026-10-15',
  thumbnail,
  notes: 'Click the first vertex or press Enter to close a new shape; Esc removes the last one. Drag vertices to move them. Double-click a vertex to delete it, or an edge to add one. Drop an image on the paper to print it.',
  mobileNotes: 'Drag vertices to reshape the paper. Use the panel to tune the tear and print an image.',
};

export default meta;
