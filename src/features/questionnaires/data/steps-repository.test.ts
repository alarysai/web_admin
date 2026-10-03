import { describe, expect, it } from "vitest";

import { DEFAULT_ANSWER_FIELDS, type Step } from "../domain/schemas";
import { stepDocument } from "./steps-repository";

describe("stepDocument", () => {
  it("stores tipIds with every tip the step links to, so tip usages are one array-contains query", () => {
    const step: Step = {
      order: 1,
      type: "question",
      text: { pt: "Retrata pessoas reais?", en: null, es: null },
      image: null,
      videoUrl: null,
      options: [
        { id: "sim", text: { pt: "Sim", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null, tipId: "consent" },
        { id: "nao", text: { pt: "Não", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null, tipId: null },
      ],
      nextStepId: null,
      partOfPrompt: false,
      promptInstruction: null,
      infoFlag: { label: { pt: "Isso é ético?", en: null, es: null }, value: true, tipId: "ethics" },
      ...DEFAULT_ANSWER_FIELDS,
      answerType: "yes_no",
    };
    expect(stepDocument(step)).toEqual({ ...step, tipIds: ["ethics", "consent"] });
  });
});
