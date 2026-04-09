import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Window Manager",
  description:
    "A physics-based DOM window manager — drag with momentum, sticky snap, tile by dropping onto edges.",
  tags: ["dom", "physics", "interactive", "ui"],
  date: "2026-04-08",
  notes:
    "Drag titlebars to move. Drop onto window edges to tile. Use the panel to toggle features.",
  mobileNotes:
    "Drag titlebars to move windows. Use the panel to close or reposition.",
  thumbnail,
};

export default meta;
