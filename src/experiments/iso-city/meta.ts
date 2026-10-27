import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Iso City",
  description:
    "Isometric city bowling: buildings are hinged rigid boxes that topple, rock back or fall like dominoes when the ball hits them. Cars drive their lanes.",
  tags: ["canvas", "physics", "isometric", "simulation"],
  date: "2026-04-12",
  notes:
    "Drag from any street, roof or wall and release to throw — the dotted line shows the path. Tall towers topple and knock their neighbours over. R rebuilds the city.",
  mobileNotes:
    "Drag from any street or roof and release to throw — the dotted line shows the path. Tap RESET to rebuild the city.",
  thumbnail,
};

export default meta;
