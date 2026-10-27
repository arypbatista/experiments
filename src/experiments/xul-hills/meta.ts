import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Xul Hills',
  description: 'Layered hill silhouettes — round domes and sharp peaks — shaded like a Xul Solar colored-pencil landscape: dark rims, misty valleys, shapes that merge and haze each other.',
  tags: ['webgl', 'shader', 'generative', 'editor'],
  date: '2026-10-16',
  thumbnail,
  notes: 'Click the sky (or double-click anywhere) to add a hill. Drag hills, the ◆ handle and the sun to reshape the scene. Same layer merges, front layers haze the ones behind — full controls in the README.',
  mobileNotes: 'Tap the sky or double-tap to add a hill. Drag hills, the ◆ handle and the sun. Use the panel to change layer, palette and shape.',
};

export default meta;
