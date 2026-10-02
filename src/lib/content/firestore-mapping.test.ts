import { describe, expect, it } from "vitest";

import { asDate, asEnum, asLocalizedText, asNumber, asOptionalLocalizedText, asString } from "./firestore-mapping";

describe("firestore mapping helpers", () => {
  it("asString keeps non-blank text only", () => {
    expect(asString("abc")).toBe("abc");
    expect(asString("   ")).toBeNull();
    expect(asString(42)).toBeNull();
    expect(asString(undefined)).toBeNull();
  });

  it("asNumber falls back for missing, text or NaN", () => {
    expect(asNumber(3)).toBe(3);
    expect(asNumber("3")).toBe(0);
    expect(asNumber(Number.NaN, 9)).toBe(9);
  });

  it("asLocalizedText tolerates missing and malformed fields", () => {
    expect(asLocalizedText({ pt: "Olá", en: 1 })).toEqual({ pt: "Olá", en: null, es: null });
    expect(asLocalizedText(undefined)).toEqual({ pt: "", en: null, es: null });
  });

  it("asOptionalLocalizedText keeps null as null", () => {
    expect(asOptionalLocalizedText(null)).toBeNull();
    expect(asOptionalLocalizedText({ pt: "x" })).toEqual({ pt: "x", en: null, es: null });
  });

  it("asDate converts Timestamps and ignores anything else", () => {
    const date = new Date("2026-10-02T12:00:00Z");
    expect(asDate({ toDate: () => date })).toBe(date);
    expect(asDate("2026-10-02")).toBeNull();
  });

  it("asEnum falls back for unknown values", () => {
    expect(asEnum("draft", ["draft", "published"] as const, "draft")).toBe("draft");
    expect(asEnum("archived", ["draft", "published"] as const, "draft")).toBe("draft");
  });
});
