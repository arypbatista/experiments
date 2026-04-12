import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Fluid",
  description:
    "2D Eulerian grid fluid solver — velocity advection, pressure projection, and dye injection on drag.",
  tags: ["canvas", "simulation", "physics"],
  date: "2026-04-12",
  notes: "Drag to inject dye. C to clear.",
  mobileNotes: "Drag to inject dye.",
  thumbnail,
};

export default meta;
