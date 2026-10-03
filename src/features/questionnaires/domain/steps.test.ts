import { describe, expect, it } from "vitest";

import { clearJumpsTo, nextStepOrder, questionnaireLanguages, sortSteps, type StepRecord } from "./steps";
import { DEFAULT_ANSWER_FIELDS } from "./schemas";

const full = (word: string) => ({ pt: word, en: `${word}-en`, es: `${word}-es` });
const ptOnly = (word: string) => ({ pt: word, en: null, es: null });

function step(id: string, overrides: Partial<StepRecord> = {}): StepRecord {
  return {
    id,
    order: 1,
    type: "question",
    text: full(id),
    image: null,
    videoUrl: null,
    options: [{ id: `${id}-o1`, text: full("opção"), image: null, promptInstruction: null, nextStepId: null, tipId: null }],
    nextStepId: null,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
    ...overrides,
  };
}

describe("sortSteps / nextStepOrder", () => {
  it("orders by order, then id", () => {
    expect(sortSteps([step("b", { order: 2 }), step("c", { order: 1 }), step("a", { order: 2 })]).map((s) => s.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("puts a new step after the last one", () => {
    expect(nextStepOrder([])).toBe(1);
    expect(nextStepOrder([{ order: 3 }, { order: 7 }, { order: 5 }])).toBe(8);
  });
});

describe("questionnaireLanguages", () => {
  const questionnaire = { title: full("título"), description: null };

  it("counts a language only when the questionnaire, steps, options and info flags have it", () => {
    expect(questionnaireLanguages(questionnaire, [step("s1")])).toEqual(["pt", "en", "es"]);
  });

  it("drops a language missing in any option", () => {
    const s = step("s1", {
      options: [{ id: "o1", text: { pt: "Sim", en: "Yes", es: null }, image: null, promptInstruction: null, nextStepId: null, tipId: null }],
    });
    expect(questionnaireLanguages(questionnaire, [s])).toEqual(["pt", "en"]);
  });

  it("drops a language missing in an info flag label", () => {
    const s = step("s1", { infoFlag: { label: ptOnly("Isso é ético?"), value: true, tipId: null } });
    expect(questionnaireLanguages(questionnaire, [s])).toEqual(["pt"]);
  });

  it("uses only the questionnaire texts when there are no steps", () => {
    expect(questionnaireLanguages({ title: ptOnly("x"), description: null }, [])).toEqual(["pt"]);
  });
});

describe("clearJumpsTo", () => {
  it("resets step and option jumps that pointed to the deleted step", () => {
    const steps = [
      step("s1", { nextStepId: "s3" }),
      step("s2", {
        options: [
          { id: "a", text: full("a"), image: null, promptInstruction: null, nextStepId: "s3", tipId: null },
          { id: "b", text: full("b"), image: null, promptInstruction: null, nextStepId: "__end__", tipId: null },
        ],
      }),
      step("s3"),
      step("s4", { nextStepId: "s2" }),
    ];

    const patches = clearJumpsTo("s3", steps);

    expect(patches.map((patch) => patch.stepId)).toEqual(["s1", "s2"]);
    expect(patches[0].nextStepId).toBeNull();
    expect(patches[1].options.map((option) => option.nextStepId)).toEqual([null, "__end__"]);
  });

  it("returns nothing when no step pointed to it", () => {
    expect(clearJumpsTo("s9", [step("s1", { nextStepId: "s2" }), step("s2")])).toEqual([]);
  });
});
