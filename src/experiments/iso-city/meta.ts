import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Iso City",
  description:
    "Isometric city with physics. Drag to throw a ball and knock over buildings like bowling pins. Cars roam the streets.",
  tags: ["canvas", "physics", "isometric", "simulation"],
  date: "2026-04-12",
  notes:
    "Drag to aim and throw the ball. Hit buildings and cars! Press R to reset.",
  mobileNotes:
    "Drag to aim and throw. Hit buildings and cars! Tap RESET to restart.",
  thumbnail,
};

export default meta;
