import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Orbits",
  description:
    "N-body gravitational simulation with drag-to-launch and collision merging.",
  tags: ["physics", "canvas", "simulation"],
  date: "2026-04-11",
  notes:
    "Drag to launch a new body (pull back, release). Scroll to zoom. R resets, F fits view.",
  mobileNotes: "Tap and drag to launch bodies. Pinch to zoom.",
  thumbnail,
};

export default meta;
