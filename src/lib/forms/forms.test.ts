import { describe, expect, it } from "vitest";
import { z } from "zod";

import { formValues, readInteger, readLocalizedText, readOptionalLocalizedText } from "./form-data";
import { zodFieldErrors } from "./form-state";
import { localizedValues, resolveValues } from "./initial-values";

function form(entries: Record<string, string>) {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.append(key, value));
  return data;
}

describe("form-data", () => {
  it("formValues drops React's internal entries", () => {
    expect(formValues(form({ "title.pt": "A", $ACTION_ID_abc: "", order: "1" }))).toEqual({ "title.pt": "A", order: "1" });
  });

  it("readInteger turns blank into NaN and keeps decimals for the schema to reject", () => {
    expect(readInteger(form({ order: " 3 " }), "order")).toBe(3);
    expect(readInteger(form({ order: "" }), "order")).toBeNaN();
    expect(readInteger(form({}), "order")).toBeNaN();
    expect(readInteger(form({ order: "1.5" }), "order")).toBe(1.5);
  });

  it("readLocalizedText reads the three languages", () => {
    expect(readLocalizedText(form({ "title.pt": "Olá", "title.es": "Hola" }), "title")).toEqual({
      pt: "Olá",
      en: "",
      es: "Hola",
    });
  });

  it("readOptionalLocalizedText is null only when every language is blank", () => {
    expect(readOptionalLocalizedText(form({ "d.pt": " ", "d.en": "", "d.es": "" }), "d")).toBeNull();
    expect(readOptionalLocalizedText(form({ "d.pt": "", "d.en": "Hi", "d.es": "" }), "d")).toEqual({ pt: "", en: "Hi", es: "" });
  });
});

describe("zodFieldErrors", () => {
  it("keys the first message of each field by dotted path", () => {
    const schema = z.object({ title: z.object({ pt: z.string().min(1, "Obrigatório.") }), order: z.number().min(0, "Mínimo 0.").min(-5, "outro") });
    const result = schema.safeParse({ title: { pt: "" }, order: -10 });
    expect(zodFieldErrors(result.error!)).toEqual({ "title.pt": "Obrigatório.", order: "Mínimo 0." });
  });
});

describe("initial values", () => {
  it("localizedValues flattens a saved text, with blanks for missing translations", () => {
    expect(localizedValues("name", { pt: "Ética", en: null, es: "Ética" })).toEqual({
      "name.pt": "Ética",
      "name.en": "",
      "name.es": "Ética",
    });
    expect(localizedValues("name", null)).toEqual({ "name.pt": "", "name.en": "", "name.es": "" });
  });

  it("resolveValues prefers what the admin just submitted", () => {
    expect(resolveValues({ order: "1", "name.pt": "A" }, { order: "x" })).toEqual({ order: "x", "name.pt": "A" });
    expect(resolveValues({ order: "1" }, null)).toEqual({ order: "1" });
  });
});
