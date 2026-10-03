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
        options: [{ id: "o1", text: { pt: "Sim" }, image: null, promptInstruction: "seja breve", nextStepId: "s3", tipId: "t2" }],
        nextStepId: "__end__",
        partOfPrompt: true,
        promptInstruction: null,
        infoFlag: { label: { pt: "Isso é ético?" }, value: true, tipId: "t1" },
        answerType: "yes_no",
        helpText: { pt: "Ajuda" },
        required: false,
        maxLength: 120,
        placeholder: null,
        tipIds: ["t1", "t2"],
      }),
    ).toEqual({
      id: "s1",
      order: 2,
      type: "question",
      text: { pt: "Qual?", en: "Which?", es: null },
      image: null,
      videoUrl: null,
      options: [
        { id: "o1", text: { pt: "Sim", en: null, es: null }, image: null, promptInstruction: "seja breve", nextStepId: "s3", tipId: "t2" },
      ],
      nextStepId: "__end__",
      partOfPrompt: true,
      promptInstruction: null,
      infoFlag: { label: { pt: "Isso é ético?", en: null, es: null }, value: true, tipId: "t1" },
      answerType: "yes_no",
      helpText: { pt: "Ajuda", en: null, es: null },
      required: false,
      maxLength: 120,
      placeholder: null,
    });
  });

  it("reads documents saved before v2 with the defaults the apps assume", () => {
    expect(toStep("s1", { type: "question", options: [{ id: "o1", text: { pt: "Sim" } }] })).toMatchObject({
      answerType: "single_choice",
      helpText: null,
      required: true,
      maxLength: 500,
      placeholder: null,
      options: [{ id: "o1", tipId: null }],
    });
  });

  it.each([[0], [5001], [1.5], ["300"]])("falls back to the default limit for maxLength %j", (maxLength) => {
    expect(toStep("s1", { maxLength }).maxLength).toBe(500);
  });

  it("treats an unknown answer type as single choice and only false as not required", () => {
    expect(toStep("s1", { answerType: "slider", required: "no" })).toMatchObject({ answerType: "single_choice", required: true });
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
