import { describe, expect, it } from "vitest";

import { findCycle, resolveNext, transitionsOf, validateFlow } from "./flow";
import { checkPublishable } from "./lifecycle";
import { DEFAULT_ANSWER_FIELDS, questionnaireInputSchema, stepSchema, type AnswerType, type Step } from "./schemas";
import { questionnaireLanguages, stepTipIds, type StepRecord } from "./steps";

/** Answer types, optional questions and option tips (proposta-questionario-v2). */

const pt = (value: string) => ({ pt: value, en: null, es: null });
const full = (value: string) => ({ pt: value, en: `${value}-en`, es: `${value}-es` });

function option(id: string, nextStepId: string | null = null, tipId: string | null = null) {
  return { id, text: full(id), image: null, promptInstruction: null, nextStepId, tipId };
}

function question(answerType: AnswerType, overrides: Partial<Step> = {}): Step {
  return {
    order: 1,
    type: "question",
    text: full("Pergunta"),
    image: null,
    videoUrl: null,
    options: [option("a"), option("b")],
    nextStepId: null,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
    answerType,
    ...overrides,
  };
}

const record = (id: string, order: number, step: Step): StepRecord => ({ ...step, id, order });
const video = (id: string, order: number, nextStepId: string | null = null): StepRecord =>
  record(id, order, { ...question("single_choice"), type: "video", options: [], videoUrl: "https://youtu.be/x", nextStepId });

const issues = (step: Step) =>
  (stepSchema.safeParse(step).error?.issues ?? []).map((issue) => `${issue.path.join(".")}: ${issue.message}`);

describe("stepSchema — answer types", () => {
  it("accepts every answer type in its valid shape", () => {
    expect(issues(question("single_choice"))).toEqual([]);
    expect(issues(question("multiple_choice"))).toEqual([]);
    expect(issues(question("yes_no"))).toEqual([]);
    expect(issues(question("open_text", { options: [], maxLength: 280, placeholder: pt("Descreva…") }))).toEqual([]);
  });

  it("open text has no options", () => {
    expect(issues(question("open_text"))).toEqual(["options: Resposta aberta não tem opções."]);
  });

  it("yes/no needs exactly 2 options", () => {
    expect(issues(question("yes_no", { options: [option("a"), option("b"), option("c")] }))).toEqual([
      "options: Sim ou não precisa de exatamente 2 opções (ex.: Sim e Não).",
    ]);
  });

  it("multiple choice options cannot jump; yes/no options can", () => {
    expect(issues(question("multiple_choice", { options: [option("a", "s9"), option("b")] }))).toEqual([
      "options.0.nextStepId: Na múltipla escolha o salto é do passo, não da opção.",
    ]);
    expect(issues(question("yes_no", { options: [option("a", "s9"), option("b", "__end__")] }))).toEqual([]);
  });

  it("only questions can be optional", () => {
    const optionalVideo = { ...question("single_choice"), type: "video" as const, options: [], videoUrl: "https://youtu.be/x", required: false };
    expect(issues(optionalVideo)).toEqual(["required: Só perguntas podem ser opcionais."]);
    expect(issues(question("single_choice", { required: false }))).toEqual([]);
  });

  it.each([[0], [5001], [2.5]])("rejects maxLength %j", (maxLength) => {
    expect(issues(question("open_text", { options: [], maxLength }))[0]).toMatch(/^maxLength: /);
  });

  it("rejects an unknown answer type", () => {
    expect(issues(question("slider" as AnswerType))[0]).toMatch(/^answerType: /);
  });
});

describe("questionnaireInputSchema — creditCost", () => {
  const base = { title: pt("Criar imagem"), description: null, categoryId: "c1", order: 0 };

  it("accepts a whole number ≥ 0 or null", () => {
    expect(questionnaireInputSchema.parse({ ...base, creditCost: 4 }).creditCost).toBe(4);
    expect(questionnaireInputSchema.parse({ ...base, creditCost: 0 }).creditCost).toBe(0);
    expect(questionnaireInputSchema.parse({ ...base, creditCost: null }).creditCost).toBeNull();
  });

  it.each([[-1], [1.5], [Number.NaN]])("rejects %j", (creditCost) => {
    expect(questionnaireInputSchema.safeParse({ ...base, creditCost }).success).toBe(false);
  });
});

describe("flow — jumps by answer type", () => {
  it("multiple choice and open text ignore option jumps and follow the step", () => {
    const steps = [
      record("q", 1, question("multiple_choice", { options: [option("a", "end-step")], nextStepId: "v" })),
      video("end-step", 2),
      video("v", 3),
    ];
    expect(resolveNext(steps[0], steps[0].options[0], steps)).toBe("v");
    expect(transitionsOf(steps[0], steps)).toEqual([{ via: "continue", optionId: null, target: "v" }]);
  });

  it("optional questions add a skip that follows the step's jump, never an option's", () => {
    const steps = [record("q", 1, question("single_choice", { required: false, options: [option("a", "__end__"), option("b")] })), video("v", 2)];
    expect(transitionsOf(steps[0], steps)).toEqual([
      { via: "option", optionId: "a", target: null },
      { via: "option", optionId: "b", target: "v" },
      { via: "skip", optionId: null, target: "v" },
    ]);
  });

  it("a stale option jump in multiple choice is neither validated nor followed", () => {
    // Legacy data: the jump points to a missing step, but multiple choice ignores option jumps.
    const steps = [record("q", 1, question("multiple_choice", { options: [option("a", "ghost")] }))];
    expect(validateFlow(steps)).toEqual([]);
  });

  it("detects a cycle reachable only through Pular", () => {
    const steps = [
      video("a", 1),
      record("q", 2, question("single_choice", { required: false, options: [option("x", "__end__")], nextStepId: "a" })),
    ];
    expect(findCycle(steps)).toEqual(["a", "q", "a"]);
  });
});

describe("tips linked by options", () => {
  const withTips = record(
    "q",
    1,
    question("single_choice", {
      options: [option("a", null, "consent"), option("b", null, "consent")],
      infoFlag: { label: pt("Isso é ético?"), value: true, tipId: "ethics" },
    }),
  );

  it("stepTipIds lists the info flag and option tips once", () => {
    expect(stepTipIds(withTips)).toEqual(["ethics", "consent"]);
    expect(stepTipIds(question("single_choice"))).toEqual([]);
  });

  it("publishing blocks a deleted option tip and warns about an inactive one", () => {
    const category = { exists: true, active: true };
    expect(checkPublishable([withTips], category, new Map([["ethics", { active: true }]]))).toEqual({
      ok: false,
      problems: ["O passo #1 está ligado a uma dica que não existe mais."],
    });
    expect(
      checkPublishable([withTips], category, new Map([["ethics", { active: true }], ["consent", { active: false }]])),
    ).toMatchObject({ ok: true, warnings: [expect.stringContaining("Dica inativa nos passos #1")] });
  });
});

describe("languages with help text and placeholder", () => {
  it("drops a language missing in the help text or the placeholder", () => {
    const questionnaire = { title: full("Título"), description: null };
    expect(questionnaireLanguages(questionnaire, [question("single_choice", { helpText: pt("Ajuda") })])).toEqual(["pt"]);
    expect(questionnaireLanguages(questionnaire, [question("open_text", { options: [], placeholder: full("Ex.") })])).toEqual(["pt", "en", "es"]);
  });
});
