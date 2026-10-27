import type { ExperimentMeta } from "../types";
import thumbnail from "./thumbnail.png";

const meta: ExperimentMeta = {
  title: "Sand",
  description:
    "Falling-sand cellular automaton. Draw sand, water, fire, and walls.",
  tags: ["canvas", "simulation", "cellular-automaton"],
  date: "2026-04-11",
  notes:
    "Draw with mouse. 1=sand 2=water 3=fire 4=wall 5=attractor 6=soil E=erase C=clear. Toggle global gravity in the panel.",
  mobileNotes:
    "Draw with touch. Tap buttons to switch material or clear; toggle global gravity in the panel.",
  thumbnail,
};

export default meta;
