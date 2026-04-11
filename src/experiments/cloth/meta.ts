import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Cloth",
  description: "Verlet-integrated cloth grid with mouse tearing and wind.",
  tags: ["canvas", "physics", "simulation"],
  date: "2026-04-11",
  notes: "Click and drag to tear. Press W or click WIND to toggle wind.",
  mobileNotes: "Tap and drag to tear. Toggle WIND button for wind.",
  thumbnail,
};

export default meta;
