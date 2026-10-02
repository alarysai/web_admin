import { describe, expect, it } from "vitest";

import { checkPublishable, copyTitle, duplicateSteps } from "./lifecycle";
import type { StepRecord } from "./steps";

function video(id: string, order: number, nextStepId: string | null = null): StepRecord {
  return {
    id,
    order,
    type: "video",
    text: { pt: id, en: null, es: null },
    image: null,
    videoUrl: "https://youtu.be/x",
    options: [],
    nextStepId,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
  };
}

const activeCategory = { exists: true, active: true };

describe("checkPublishable", () => {
  it("accepts a valid questionnaire", () => {
    expect(checkPublishable([video("a", 1), video("b", 2)], activeCategory)).toEqual({ ok: true, warnings: [] });
  });

  it("warns, but allows, an inactive category", () => {
    const result = checkPublishable([video("a", 1)], { exists: true, active: false });
    expect(result).toMatchObject({ ok: true, warnings: [expect.stringContaining("categoria está inativa")] });
  });

  it("requires at least one step and an existing category", () => {
    expect(checkPublishable([], { exists: false, active: false })).toEqual({
      ok: false,
      problems: ["Adicione ao menos um passo.", "A categoria do questionário não existe mais. Escolha outra."],
    });
  });

  it("rejects a step that fails the schema (legacy data)", () => {
    const broken = { ...video("a", 3), videoUrl: null };
    const result = checkPublishable([broken], activeCategory);
    expect(result).toMatchObject({ ok: false, problems: [expect.stringContaining("passo #3 tem campos inválidos")] });
  });

  it("rejects cycles and jumps to missing steps", () => {
    const result = checkPublishable([video("a", 1, "b"), video("b", 2, "a"), video("c", 3, "ghost")], activeCategory);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      "O passo #3 salta para um passo que não existe.",
      "O fluxo tem um ciclo (#1 → #2 → #1).",
    ]);
  });
});

describe("copyTitle", () => {
  it("marks the copy in each filled language", () => {
    expect(copyTitle({ pt: "Ética", en: "Ethics", es: null })).toEqual({ pt: "Ética (cópia)", en: "Ethics (copy)", es: null });
  });
});

describe("duplicateSteps", () => {
  it("gives new ids and remaps jumps to the copy", () => {
    let counter = 0;
    const steps: StepRecord[] = [
      video("a", 1, "c"),
      {
        ...video("b", 2, "__end__"),
        type: "question",
        videoUrl: null,
        options: [
          { id: "o1", text: { pt: "x", en: null, es: null }, image: null, promptInstruction: null, nextStepId: "a" },
          { id: "o2", text: { pt: "y", en: null, es: null }, image: null, promptInstruction: null, nextStepId: "ghost" },
        ],
      },
      video("c", 3),
    ];

    const copy = duplicateSteps(steps, () => `new${++counter}`);

    expect(copy.map((step) => step.id)).toEqual(["new1", "new2", "new3"]);
    expect(copy[0].nextStepId).toBe("new3");
    expect(copy[1].nextStepId).toBe("__end__");
    expect(copy[1].options.map((option) => option.nextStepId)).toEqual(["new1", null]);
    // Option ids stay: they are unique within their step.
    expect(copy[1].options.map((option) => option.id)).toEqual(["o1", "o2"]);
    // The original is untouched.
    expect(steps[0].id).toBe("a");
  });
});
