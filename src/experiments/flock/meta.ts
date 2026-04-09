import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Flock",
  description:
    "GPGPU boids — thousands of dots flocking in 3D with separation, alignment, and cohesion.",
  tags: ["three.js", "gpgpu", "simulation"],
  date: "2026-04-08",
  notes: "Move your cursor to disturb the flock.",
  mobileNotes: "Touch to disturb the flock.",
  thumbnail,
};

export default meta;
