import { describe, expect, it } from "vitest";

import { promptParts, type VisitedStep } from "./prompt-preview";
import { DEFAULT_ANSWER_FIELDS, type AnswerType } from "./schemas";
import type { StepRecord } from "./steps";

const pt = (value: string) => ({ pt: value, en: null, es: null });

function question(id: string, answerType: AnswerType, overrides: Partial<StepRecord> = {}): StepRecord {
  return {
    id,
    order: 1,
    type: "question",
    text: pt(id),
    image: null,
    videoUrl: null,
    options: [
      { id: "a", text: { pt: "Ética", en: "Ethics", es: null }, image: null, promptInstruction: "foque em ética", nextStepId: null, tipId: null },
      { id: "b", text: pt("Redação"), image: null, promptInstruction: null, nextStepId: null, tipId: null },
      { id: "c", text: pt("Ciência"), image: null, promptInstruction: "use dados", nextStepId: null, tipId: null },
    ],
    nextStepId: null,
    partOfPrompt: true,
    promptInstruction: "Escreva um texto curto",
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
    answerType,
    ...overrides,
  };
}

const visit = (stepId: string, overrides: Partial<VisitedStep> = {}): VisitedStep => ({
  stepId,
  optionIds: [],
  text: null,
  skipped: false,
  ...overrides,
});

describe("promptParts", () => {
  it("single choice: the option text and both instructions, in the user's language", () => {
    const steps = [question("tema", "single_choice")];
    expect(promptParts([visit("tema", { optionIds: ["a"] })], steps, "en")).toEqual([
      { stepId: "tema", answer: "Ethics", instructions: ["Escreva um texto curto", "foque em ética"] },
    ]);
  });

  it("yes/no works like single choice", () => {
    const steps = [question("ok", "yes_no", { options: question("x", "yes_no").options.slice(0, 2) })];
    expect(promptParts([visit("ok", { optionIds: ["b"] })], steps, "pt")).toEqual([
      { stepId: "ok", answer: "Redação", instructions: ["Escreva um texto curto"] },
    ]);
  });

  it("multiple choice: chosen texts in the step's order, joined with ', ', and each chosen instruction", () => {
    const steps = [question("temas", "multiple_choice")];
    // Tapped c before a: the answer still follows the step order.
    expect(promptParts([visit("temas", { optionIds: ["c", "a"] })], steps, "pt")).toEqual([
      { stepId: "temas", answer: "Ética, Ciência", instructions: ["Escreva um texto curto", "foque em ética", "use dados"] },
    ]);
  });

  it("open text: the typed text as is, with the step instruction", () => {
    const steps = [question("cena", "open_text", { options: [] })];
    expect(promptParts([visit("cena", { text: "Um gato astronauta" })], steps, "es")).toEqual([
      { stepId: "cena", answer: "Um gato astronauta", instructions: ["Escreva um texto curto"] },
    ]);
  });

  it("skipped questions and videos: no answer, only the step instruction", () => {
    const steps = [
      question("opcional", "single_choice", { required: false }),
      { ...question("intro", "single_choice"), type: "video" as const, options: [], videoUrl: "https://youtu.be/x" },
    ];
    expect(promptParts([visit("opcional", { skipped: true }), visit("intro")], steps, "pt")).toEqual([
      { stepId: "opcional", answer: null, instructions: ["Escreva um texto curto"] },
      { stepId: "intro", answer: null, instructions: ["Escreva um texto curto"] },
    ]);
  });

  it("ignores steps not marked as part of the prompt and steps that no longer exist", () => {
    const steps = [question("contexto", "single_choice", { partOfPrompt: false })];
    expect(promptParts([visit("contexto", { optionIds: ["a"] }), visit("gone")], steps, "pt")).toEqual([]);
  });

  it("an empty open answer counts as no answer", () => {
    const steps = [question("cena", "open_text", { options: [], promptInstruction: null })];
    expect(promptParts([visit("cena", { text: "   " })], steps, "pt")).toEqual([{ stepId: "cena", answer: null, instructions: [] }]);
  });
});
