import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Sand",
  description:
    "Falling-sand cellular automaton. Draw sand, water, fire, and walls.",
  tags: ["canvas", "simulation", "cellular-automaton"],
  date: "2026-04-11",
  notes: "Draw with mouse. 1=sand 2=water 3=fire 4=wall E=erase C=clear.",
  mobileNotes: "Draw with touch. Tap buttons to switch material.",
  thumbnail,
};

export default meta;
