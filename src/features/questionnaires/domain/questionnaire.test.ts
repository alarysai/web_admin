import { describe, expect, it } from "vitest";

import { filterQuestionnaires, readQuestionnaireFilters, type Questionnaire } from "./questionnaire";

function questionnaire(id: string, overrides: Partial<Questionnaire> = {}): Questionnaire {
  return {
    id,
    title: { pt: id, en: null, es: null },
    description: null,
    categoryId: "c1",
    languages: ["pt"],
    order: 0,
    status: "draft",
    updatedAt: null,
    ...overrides,
  };
}

const list = [
  questionnaire("b", { title: { pt: "Ética na escola", en: "Ethics at school", es: null }, order: 2 }),
  questionnaire("a", { title: { pt: "Redação", en: null, es: "Redacción" }, order: 1, categoryId: "c2" }),
  questionnaire("c", { title: { pt: "Ãrvore de decisão", en: null, es: null }, order: 2 }),
];

describe("filterQuestionnaires", () => {
  it("returns everything ordered by order, then title", () => {
    expect(filterQuestionnaires(list, { query: "", categoryId: null }).map((q) => q.id)).toEqual(["a", "c", "b"]);
  });

  it("searches the title in any language, ignoring case and accents", () => {
    expect(filterQuestionnaires(list, { query: "ETICA", categoryId: null }).map((q) => q.id)).toEqual(["b"]);
    expect(filterQuestionnaires(list, { query: "ethics", categoryId: null }).map((q) => q.id)).toEqual(["b"]);
    expect(filterQuestionnaires(list, { query: "redaccion", categoryId: null }).map((q) => q.id)).toEqual(["a"]);
  });

  it("filters by category", () => {
    expect(filterQuestionnaires(list, { query: "", categoryId: "c2" }).map((q) => q.id)).toEqual(["a"]);
  });

  it("combines search and category, and can return nothing", () => {
    expect(filterQuestionnaires(list, { query: "etica", categoryId: "c2" })).toEqual([]);
  });

  it("does not modify the original list", () => {
    const copy = [...list];
    filterQuestionnaires(list, { query: "", categoryId: null });
    expect(list).toEqual(copy);
  });
});

describe("readQuestionnaireFilters", () => {
  it("reads ?q= and ?categoria=", () => {
    expect(readQuestionnaireFilters({ q: "etica", categoria: "c1" })).toEqual({ query: "etica", categoryId: "c1" });
  });

  it("treats missing or blank values as no filter", () => {
    expect(readQuestionnaireFilters({})).toEqual({ query: "", categoryId: null });
    expect(readQuestionnaireFilters({ categoria: "  " })).toEqual({ query: "", categoryId: null });
  });

  it("uses the first value when a param repeats", () => {
    expect(readQuestionnaireFilters({ q: ["a", "b"] })).toEqual({ query: "a", categoryId: null });
  });
});
