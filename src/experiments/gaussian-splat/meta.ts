import type { ExperimentMeta } from '../types';
import thumbnail from './thumbnail.png';

const meta: ExperimentMeta = {
  title: 'Gaussian Splat',
  description: 'Hand-rolled 3D Gaussian Splatting viewer — EWA projection in a vertex shader, depth sort in a worker — showing a procedural knot or real 3DGS captures.',
  tags: ['webgl', 'three.js', 'shader', '3d', 'gaussian-splatting'],
  date: '2026-10-27',
  thumbnail,
  notes: 'Drag to orbit, scroll to zoom, right-drag to pan. Pick a model in the panel, or drop your own .splat / .ply file. A toggles auto-rotate, R resets the view, O opens a file.',
  mobileNotes: 'Drag to orbit, pinch to zoom. Pick a model in the panel.',
};

export default meta;
