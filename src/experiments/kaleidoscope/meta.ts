import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Kaleidoscope",
  description:
    "Procedural plasma mirrored N times with polar fold. Drag to spin, adjust segments and pattern.",
  tags: ["canvas", "three.js", "generative", "interactive", "shader"],
  date: "2026-04-12",
  notes:
    "Drag to spin · adjust segments, speed, and detail in the panel · click WEBCAM [W] to use your camera",
  mobileNotes: "Drag to spin · adjust segments, speed, and detail in the panel",
  thumbnail,
};

export default meta;
