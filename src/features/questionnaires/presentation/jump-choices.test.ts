import { describe, expect, it } from "vitest";

import type { StepRecord } from "../domain/steps";
import { jumpChoices, jumpTargets } from "./jump-choices";

const step = (id: string, order: number, pt: string | null): StepRecord => ({
  id,
  order,
  type: "video",
  text: pt === null ? null : { pt, en: null, es: null },
  image: null,
  videoUrl: "https://youtu.be/x",
  options: [],
  nextStepId: null,
  partOfPrompt: false,
  promptInstruction: null,
  infoFlag: null,
});

describe("jumpTargets", () => {
  it("lists the other steps with order and a short text", () => {
    const long = "x".repeat(60);
    expect(jumpTargets([step("a", 1, "Intro"), step("b", 2, long), step("c", 3, null)], "a")).toEqual([
      { id: "b", label: `#2 · ${"x".repeat(49)}…` },
      { id: "c", label: "#3 · (sem texto)" },
    ]);
  });
});

describe("jumpChoices", () => {
  const targets = [{ id: "b", label: "#2 · B" }];

  it("starts with the default and ends with the end of the questionnaire", () => {
    expect(jumpChoices(targets, "Seguir a ordem", "")).toEqual([
      { value: "", label: "Seguir a ordem" },
      { value: "b", label: "Ir para #2 · B" },
      { value: "__end__", label: "Encerrar o questionário" },
    ]);
  });

  it("keeps an unknown saved value visible", () => {
    expect(jumpChoices(targets, "Seguir a ordem", "ghost").at(-1)).toEqual({ value: "ghost", label: "Passo inexistente (ghost)" });
    expect(jumpChoices(targets, "Seguir a ordem", "b")).toHaveLength(3);
  });
});
