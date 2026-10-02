import { describe, expect, it } from "vitest";

import { toQuestionnaire } from "./questionnaire-mapper";

describe("toQuestionnaire", () => {
  it("maps a complete document", () => {
    const updatedAt = new Date("2026-10-02T12:00:00Z");
    expect(
      toQuestionnaire("q1", {
        title: { pt: "Ética", en: "Ethics", es: null },
        description: null,
        categoryId: "c1",
        languages: ["pt", "en"],
        order: 3,
        status: "published",
        updatedAt: { toDate: () => updatedAt },
      }),
    ).toEqual({
      id: "q1",
      title: { pt: "Ética", en: "Ethics", es: null },
      description: null,
      categoryId: "c1",
      languages: ["pt", "en"],
      order: 3,
      status: "published",
      updatedAt,
    });
  });

  it("never shows a malformed document as published", () => {
    expect(toQuestionnaire("q1", { status: "PUBLISHED" }).status).toBe("draft");
  });

  it("fills safe defaults for missing fields", () => {
    expect(toQuestionnaire("q1", undefined)).toMatchObject({
      title: { pt: "", en: null, es: null },
      categoryId: "",
      languages: ["pt"],
      order: 0,
      status: "draft",
      updatedAt: null,
    });
  });

  it("drops unknown languages", () => {
    expect(toQuestionnaire("q1", { languages: ["es", "fr", "pt"] }).languages).toEqual(["pt", "es"]);
  });
});
