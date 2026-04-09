import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Flock Images",
  description:
    "Particles flock and scatter to form 3D shapes using seek/avoid steering behaviors.",
  tags: ["three.js", "particles", "boids", "3d"],
  date: "2026-04-08",
  notes:
    "Drag to orbit · Scroll to zoom\nClick 1–8 to jump to a shape · AUTO resumes cycling",
  thumbnail,
};

export default meta;
