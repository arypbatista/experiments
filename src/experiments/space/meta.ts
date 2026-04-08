import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Space",
  description:
    "Earth, Moon, and a ship on a Hohmann transfer orbit — rendered in WebGL with Newtonian gravity.",
  tags: ["webgl", "physics", "three.js"],
  date: "2026-04-07T23:16:18",
  notes:
    "Drag to slingshot a ship. A/D to rotate heading. B to burn. L to auto-launch. C to crash one ship.",
  mobileNotes: "Tap and drag to slingshot a ship toward any direction.",
  thumbnail,
};

export default meta;
