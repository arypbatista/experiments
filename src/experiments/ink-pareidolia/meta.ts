import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Pareidolia',
  description: 'Wipe the paper off an ink drawing and the faces hiding in the scribbles open hand-drawn eyes and watch you.',
  tags: ['ink', 'canvas', 'interactive'],
  date: '2026-10-27',
  thumbnail,
  notes: 'Move the cursor to wipe the paper away and uncover the ink. Some shapes wake up and look back; linger and they keep staring. D toggles a debug view (click logs drawing coords).',
  mobileNotes: 'Drag your finger to wipe the paper away. Some shapes wake up and look back; linger and they keep staring.',
};

export default meta;
