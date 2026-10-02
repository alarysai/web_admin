import { describe, expect, it } from "vitest";

import { completeLanguages, displayText, localizedTextSchema, normalizeForSearch } from "./localized-text";

describe("localizedTextSchema", () => {
  it("trims and turns blank translations into null", () => {
    expect(localizedTextSchema.parse({ pt: "  Ética  ", en: " ", es: "Ética" })).toEqual({ pt: "Ética", en: null, es: "Ética" });
  });

  it("accepts null translations (as stored in Firestore)", () => {
    expect(localizedTextSchema.parse({ pt: "Olá", en: null, es: null })).toEqual({ pt: "Olá", en: null, es: null });
  });

  it("requires Portuguese", () => {
    const result = localizedTextSchema.safeParse({ pt: "   ", en: "Hello", es: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["pt"], message: "Obrigatório em português." });
  });
});

describe("completeLanguages", () => {
  const full = { pt: "a", en: "b", es: "c" };

  it("always includes Portuguese", () => {
    expect(completeLanguages([])).toEqual(["pt"]);
    expect(completeLanguages([{ pt: "a", en: null, es: null }])).toEqual(["pt"]);
  });

  it("lists a language only when every text has it", () => {
    expect(completeLanguages([full, { pt: "x", en: "y", es: null }])).toEqual(["pt", "en"]);
    expect(completeLanguages([full, full])).toEqual(["pt", "en", "es"]);
  });

  it("ignores optional texts that were left empty", () => {
    expect(completeLanguages([full, null])).toEqual(["pt", "en", "es"]);
  });
});

describe("displayText", () => {
  it("falls back to Portuguese when the translation is missing", () => {
    expect(displayText({ pt: "Olá", en: null, es: "Hola" }, "en")).toBe("Olá");
    expect(displayText({ pt: "Olá", en: null, es: "Hola" }, "es")).toBe("Hola");
    expect(displayText(null)).toBe("");
  });
});

describe("normalizeForSearch", () => {
  it("ignores case and accents", () => {
    expect(normalizeForSearch("  ÉTICA na Educação ")).toBe("etica na educacao");
  });
});
