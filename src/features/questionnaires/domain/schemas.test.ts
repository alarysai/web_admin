import { describe, expect, it } from "vitest";

import { questionnaireInputSchema, stepOptionSchema, stepSchema, type Step } from "./schemas";
import { DEFAULT_ANSWER_FIELDS } from "./schemas";

const text = { pt: "Texto", en: null, es: null };

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("questionnaireInputSchema", () => {
  const valid = { title: { pt: "Ética na IA", en: "", es: "" }, description: null, categoryId: "c1", order: 0, creditCost: null };

  it("accepts a valid questionnaire", () => {
    expect(questionnaireInputSchema.parse(valid)).toEqual({ ...valid, title: { pt: "Ética na IA", en: null, es: null } });
  });

  it.each([
    [{ ...valid, title: { pt: " ", en: "x", es: "" } }, "title.pt"],
    [{ ...valid, categoryId: "  " }, "categoryId"],
    [{ ...valid, order: Number.NaN }, "order"],
    [{ ...valid, order: -1 }, "order"],
    [{ ...valid, order: 1.5 }, "order"],
  ])("rejects %j at %s", (input, path) => {
    expect(issuePaths(questionnaireInputSchema.safeParse(input))).toContain(path);
  });

  it("requires Portuguese when the description is filled", () => {
    const result = questionnaireInputSchema.safeParse({ ...valid, description: { pt: "", en: "Only English", es: "" } });
    expect(issuePaths(result)).toContain("description.pt");
  });
});

describe("stepOptionSchema", () => {
  const option = { id: "o1", text, image: null, promptInstruction: "  ", nextStepId: null, tipId: null };

  it("accepts an option with text and normalizes a blank instruction", () => {
    expect(stepOptionSchema.parse(option).promptInstruction).toBeNull();
  });

  it("accepts an option with only an image", () => {
    const withImage = { ...option, text: null, image: { path: "content/questionnaires/q1/a.png", url: "https://x.test/a.png" } };
    expect(stepOptionSchema.safeParse(withImage).success).toBe(true);
  });

  it("requires text or image", () => {
    expect(issuePaths(stepOptionSchema.safeParse({ ...option, text: null }))).toContain("text");
  });
});

describe("stepSchema", () => {
  const option = { id: "o1", text, image: null, promptInstruction: null, nextStepId: null, tipId: null };
  const question: Step = {
    order: 1,
    type: "question",
    text,
    image: null,
    videoUrl: null,
    options: [option],
    nextStepId: null,
    partOfPrompt: true,
    promptInstruction: null,
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
  };
  const video: Step = { ...question, type: "video", options: [], videoUrl: "https://youtu.be/abc" };

  it("accepts a question and a video", () => {
    expect(stepSchema.safeParse(question).success).toBe(true);
    expect(stepSchema.safeParse(video).success).toBe(true);
  });

  it("requires text or image", () => {
    expect(issuePaths(stepSchema.safeParse({ ...question, text: null }))).toContain("text");
  });

  it("requires at least one option in questions and no video link", () => {
    expect(issuePaths(stepSchema.safeParse({ ...question, options: [] }))).toContain("options");
    expect(issuePaths(stepSchema.safeParse({ ...question, videoUrl: "https://youtu.be/x" }))).toContain("videoUrl");
  });

  it("requires an https link in videos and no options", () => {
    expect(issuePaths(stepSchema.safeParse({ ...video, videoUrl: null }))).toContain("videoUrl");
    expect(issuePaths(stepSchema.safeParse({ ...video, videoUrl: "http://youtu.be/abc" }))).toContain("videoUrl");
    expect(issuePaths(stepSchema.safeParse({ ...video, options: [option] }))).toContain("options");
  });

  it("rejects repeated option ids", () => {
    const result = stepSchema.safeParse({ ...question, options: [option, { ...option }] });
    expect(issuePaths(result)).toContain("options.1.id");
  });

  it("accepts an info flag linked to a tip", () => {
    const withFlag = { ...question, infoFlag: { label: { pt: "Isso é ético?", en: null, es: null }, value: false, tipId: "t1" } };
    expect(stepSchema.safeParse(withFlag).success).toBe(true);
  });

  it("rejects an unknown step type", () => {
    expect(issuePaths(stepSchema.safeParse({ ...question, type: "slide" }))).toContain("type");
  });
});
