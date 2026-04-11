import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Orbits",
  description:
    "N-body gravitational simulation with drag-to-launch and collision merging.",
  tags: ["physics", "canvas", "simulation"],
  date: "2026-04-11",
  notes:
    "Drag to launch a new body. Drag direction = velocity. Bodies merge on collision.",
  mobileNotes: "Tap and drag to launch bodies.",
  thumbnail,
};

export default meta;
