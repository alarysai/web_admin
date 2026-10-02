import { describe, expect, it } from "vitest";

import { toStep } from "./step-mapper";

describe("toStep", () => {
  it("maps a complete question", () => {
    expect(
      toStep("s1", {
        order: 2,
        type: "question",
        text: { pt: "Qual?", en: "Which?", es: null },
        image: null,
        videoUrl: null,
        options: [{ id: "o1", text: { pt: "Sim" }, image: null, promptInstruction: "seja breve", nextStepId: "s3" }],
        nextStepId: "__end__",
        partOfPrompt: true,
        promptInstruction: null,
        infoFlag: { label: { pt: "Isso é ético?" }, value: true, tipId: "t1" },
      }),
    ).toEqual({
      id: "s1",
      order: 2,
      type: "question",
      text: { pt: "Qual?", en: "Which?", es: null },
      image: null,
      videoUrl: null,
      options: [
        { id: "o1", text: { pt: "Sim", en: null, es: null }, image: null, promptInstruction: "seja breve", nextStepId: "s3" },
      ],
      nextStepId: "__end__",
      partOfPrompt: true,
      promptInstruction: null,
      infoFlag: { label: { pt: "Isso é ético?", en: null, es: null }, value: true, tipId: "t1" },
    });
  });

  it("fills safe defaults for a malformed document", () => {
    expect(toStep("s1", { type: "slide", options: "x", partOfPrompt: "yes", infoFlag: { value: true } })).toMatchObject({
      type: "question",
      text: null,
      options: [],
      partOfPrompt: false,
      infoFlag: null,
    });
  });

  it("gives options without id a stable fallback id and ignores incomplete images", () => {
    const step = toStep("s1", { options: [{ text: { pt: "A" }, image: { path: "x" } }, { id: "b" }] });
    expect(step.options.map((option) => option.id)).toEqual(["option-1", "b"]);
    expect(step.options[0].image).toBeNull();
  });
});
