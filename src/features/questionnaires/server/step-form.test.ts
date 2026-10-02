import { describe, expect, it } from "vitest";

import { errorsByOptionId, optionIds, readStepForm } from "./step-form";

function form(entries: Array<[string, string]>) {
  const data = new FormData();
  entries.forEach(([key, value]) => data.append(key, value));
  return data;
}

const text = (prefix: string, pt: string): Array<[string, string]> => [
  [`${prefix}.pt`, pt],
  [`${prefix}.en`, ""],
  [`${prefix}.es`, ""],
];

const questionForm = () =>
  form([
    ["type", "question"],
    ["order", "3"],
    ["nextStepId", ""],
    ...text("text", "Qual?"),
    ["videoUrl", "https://leftover.test"],
    ["options.zz.id", "zz"],
    ["options.zz.nextStepId", "s9"],
    ...text("options.zz.text", "Segunda na tela? Não, primeira"),
    ["options.zz.promptInstruction", " seja breve "],
    ["options.aa.id", "aa"],
    ["options.aa.nextStepId", ""],
    ...text("options.aa.text", "Outra"),
    ["options.aa.promptInstruction", ""],
    ["partOfPrompt", "on"],
    ["promptInstruction", ""],
    ["infoFlag.tipId", "t1"],
  ]);

describe("optionIds", () => {
  it("keeps the order of the form, not alphabetical", () => {
    expect(optionIds(questionForm())).toEqual(["zz", "aa"]);
  });
});

describe("readStepForm", () => {
  it("reads a question with its options, keeping hidden jumps", () => {
    const step = readStepForm(questionForm());
    expect(step).toMatchObject({
      type: "question",
      order: 3,
      text: { pt: "Qual?", en: "", es: "" },
      videoUrl: null,
      nextStepId: null,
      partOfPrompt: true,
      infoFlag: null,
    });
    expect(step.options).toEqual([
      {
        id: "zz",
        text: { pt: "Segunda na tela? Não, primeira", en: "", es: "" },
        image: null,
        promptInstruction: " seja breve ",
        nextStepId: "s9",
      },
      { id: "aa", text: { pt: "Outra", en: "", es: "" }, image: null, promptInstruction: "", nextStepId: null },
    ]);
  });

  it("drops options when the type is video", () => {
    const data = questionForm();
    data.set("type", "video");
    const step = readStepForm(data);
    expect(step.options).toEqual([]);
    expect(step.videoUrl).toBe("https://leftover.test");
  });

  it("treats an unchecked checkbox as false", () => {
    const data = questionForm();
    data.delete("partOfPrompt");
    expect(readStepForm(data).partOfPrompt).toBe(false);
  });

  it("reads the info flag only when enabled, keeping the hidden tip", () => {
    const data = questionForm();
    data.append("infoFlag.enabled", "on");
    text("infoFlag.label", "Isso é ético?").forEach(([key, value]) => data.append(key, value));
    data.append("infoFlag.value", "true");
    expect(readStepForm(data).infoFlag).toEqual({
      label: { pt: "Isso é ético?", en: "", es: "" },
      value: true,
      tipId: "t1",
    });
  });
});

describe("errorsByOptionId", () => {
  it("rewrites option positions to option ids", () => {
    expect(
      errorsByOptionId({ "options.1.text.pt": "Obrigatório.", "options.0.text": "Informe…", options: "Adicione…", order: "x" }, [
        "zz",
        "aa",
      ]),
    ).toEqual({ "options.aa.text.pt": "Obrigatório.", "options.zz.text": "Informe…", options: "Adicione…", order: "x" });
  });

  it("leaves unknown positions untouched", () => {
    expect(errorsByOptionId({ "options.5.id": "x" }, ["a"])).toEqual({ "options.5.id": "x" });
  });
});
