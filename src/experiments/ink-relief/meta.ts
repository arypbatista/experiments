import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Lithic Relief',
  description: 'The ink drawing as three physical objects — a blind emboss in cotton paper, thick black lacquer, and a pin-art board — lit by a lamp you hold.',
  tags: ['ink', 'three.js', 'shaders', 'relief'],
  date: '2026-10-27',
  thumbnail,
  notes: 'Move the cursor to move the lamp. Keys 1–3 switch material. In the pinscreen, drag to orbit and scroll to zoom.',
  mobileNotes: 'Drag to move the lamp. Switch material from the menu; in the pinscreen, drag to orbit.',
};

export default meta;
