import { describe, expect, it } from "vitest";

import { promptParts } from "./prompt-preview";
import type { StepRecord } from "./steps";

const steps: StepRecord[] = [
  {
    id: "intro",
    order: 1,
    type: "video",
    text: { pt: "Assista", en: null, es: null },
    image: null,
    videoUrl: "https://youtu.be/x",
    options: [],
    nextStepId: null,
    partOfPrompt: false,
    promptInstruction: "ignore",
    infoFlag: null,
  },
  {
    id: "tema",
    order: 2,
    type: "question",
    text: { pt: "Tema?", en: null, es: null },
    image: null,
    videoUrl: null,
    options: [
      { id: "etica", text: { pt: "Ética", en: "Ethics", es: null }, image: null, promptInstruction: "foque em ética", nextStepId: null },
      { id: "outro", text: { pt: "Outro", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null },
    ],
    nextStepId: null,
    partOfPrompt: true,
    promptInstruction: "Escreva um texto curto",
    infoFlag: null,
  },
];

describe("promptParts", () => {
  it("collects answers and instructions only from steps marked as part of the prompt", () => {
    expect(
      promptParts(
        [
          { stepId: "intro", optionId: null },
          { stepId: "tema", optionId: "etica" },
        ],
        steps,
        "en",
      ),
    ).toEqual([{ stepId: "tema", answer: "Ethics", instructions: ["Escreva um texto curto", "foque em ética"] }]);
  });

  it("falls back to Portuguese and skips empty instructions", () => {
    expect(promptParts([{ stepId: "tema", optionId: "outro" }], steps, "es")).toEqual([
      { stepId: "tema", answer: "Outro", instructions: ["Escreva um texto curto"] },
    ]);
  });

  it("ignores steps that no longer exist", () => {
    expect(promptParts([{ stepId: "gone", optionId: null }], steps, "pt")).toEqual([]);
  });
});
