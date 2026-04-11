import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Metaballs",
  description:
    "Marching-squares iso-surface of blended radial fields — organic blobs that merge and split.",
  tags: ["canvas", "simulation", "generative"],
  date: "2026-04-11",
  notes: "Click to spawn a blob. Drag blobs to move them.",
  mobileNotes: "Tap to spawn a blob. Drag blobs to move them.",
  thumbnail,
};

export default meta;
