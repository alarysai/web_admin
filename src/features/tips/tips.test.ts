import { describe, expect, it, vi } from "vitest";

import { SESSION_EXPIRED_MESSAGE } from "@/lib/forms/form-state";

import { toTip } from "./data/tip-mapper";
import { filterTips, readTipFilters, tipInputSchema, tipLabel, type Tip, type TipUsage } from "./domain/tip";
import { saveTip, type SaveTipDeps } from "./server/save-tip";
import { activateTip, deactivateTip, deleteTipById, describeUsages, type ActivateDeps } from "./server/tip-lifecycle";

const admin = { uid: "admin-1", email: null };

function tip(id: string, overrides: Partial<Tip> = {}): Tip {
  return {
    id,
    categoryId: "etica",
    text: { pt: id, en: null, es: null },
    languages: ["pt"],
    order: 0,
    status: "inactive",
    updatedAt: null,
    ...overrides,
  };
}

function form(entries: Record<string, string>) {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.append(key, value));
  return data;
}

describe("tipInputSchema", () => {
  it("accepts a valid tip and normalizes blank translations", () => {
    expect(tipInputSchema.parse({ categoryId: "etica", text: { pt: "Cite fontes", en: " ", es: "Cita fuentes" }, order: 1 })).toEqual({
      categoryId: "etica",
      text: { pt: "Cite fontes", en: null, es: "Cita fuentes" },
      order: 1,
    });
  });

  it("requires category and Portuguese text", () => {
    const result = tipInputSchema.safeParse({ categoryId: "", text: { pt: "", en: "x", es: "" }, order: 0 });
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(["categoryId", "text.pt"]);
  });
});

describe("filterTips / readTipFilters", () => {
  const tips = [
    tip("b", { text: { pt: "Ética é escolha", en: "Ethics is a choice", es: null }, order: 2 }),
    tip("a", { text: { pt: "Leia antes", en: null, es: null }, order: 1, categoryId: "conhecimento" }),
  ];

  it("searches the text in any language without accents and filters by category", () => {
    expect(filterTips(tips, { query: "", categoryId: null }).map((t) => t.id)).toEqual(["a", "b"]);
    expect(filterTips(tips, { query: "ETICA", categoryId: null }).map((t) => t.id)).toEqual(["b"]);
    expect(filterTips(tips, { query: "choice", categoryId: null }).map((t) => t.id)).toEqual(["b"]);
    expect(filterTips(tips, { query: "", categoryId: "conhecimento" }).map((t) => t.id)).toEqual(["a"]);
  });

  it("reads the URL params", () => {
    expect(readTipFilters({ q: "x", categoria: " " })).toEqual({ query: "x", categoryId: null });
  });
});

describe("tipLabel", () => {
  it("shortens long texts and marks inactive tips", () => {
    expect(tipLabel({ text: { pt: "x".repeat(70), en: null, es: null }, status: "active" })).toBe(`${"x".repeat(59)}…`);
    expect(tipLabel({ text: { pt: "Cite fontes", en: null, es: null }, status: "inactive" })).toBe("Cite fontes (inativa)");
  });
});

describe("toTip", () => {
  it("treats unknown status as inactive and fills defaults", () => {
    expect(toTip("t1", { status: "on", languages: ["xx"] })).toMatchObject({ status: "inactive", languages: ["pt"], categoryId: "", order: 0 });
  });
});

describe("saveTip", () => {
  const valid = () => form({ categoryId: "etica", "text.pt": "Cite fontes", "text.en": "", "text.es": "", order: "1" });

  function deps(overrides: Partial<SaveTipDeps> = {}): SaveTipDeps {
    return {
      getCurrentAdmin: vi.fn().mockResolvedValue(admin),
      categoryExists: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue("t-new"),
      update: vi.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  it("creates and updates", async () => {
    const d = deps();
    await expect(saveTip(null, valid(), d)).resolves.toEqual({ ok: true, id: "t-new", created: true });
    await expect(saveTip("t1", valid(), d)).resolves.toEqual({ ok: true, id: "t1", created: false });
    expect(d.update).toHaveBeenCalledWith("t1", { categoryId: "etica", text: { pt: "Cite fontes", en: null, es: null }, order: 1 }, "admin-1");
  });

  it("refuses without a session, with invalid fields or an unknown category", async () => {
    expect(await saveTip(null, valid(), deps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) }))).toMatchObject({
      ok: false,
      state: { message: SESSION_EXPIRED_MESSAGE },
    });
    const invalid = valid();
    invalid.set("text.pt", "");
    expect(await saveTip(null, invalid, deps())).toMatchObject({ ok: false, state: { fieldErrors: { "text.pt": expect.any(String) } } });
    expect(await saveTip(null, valid(), deps({ categoryExists: vi.fn().mockResolvedValue(false) }))).toMatchObject({
      ok: false,
      state: { fieldErrors: { categoryId: "Categoria não encontrada." } },
    });
  });

  it("reports a tip deleted meanwhile", async () => {
    expect(await saveTip("gone", valid(), deps({ update: vi.fn().mockResolvedValue(false) }))).toMatchObject({
      ok: false,
      state: { message: "Esta dica não existe mais." },
    });
  });
});

const usages: TipUsage[] = [
  { questionnaireId: "q1", questionnaireTitle: "Ética na IA", published: true, stepId: "s1" },
  { questionnaireId: "q1", questionnaireTitle: "Ética na IA", published: true, stepId: "s2" },
  { questionnaireId: "q2", questionnaireTitle: "Redação", published: false, stepId: "s1" },
];

describe("describeUsages", () => {
  it("lists each questionnaire once and marks the published ones", () => {
    expect(describeUsages(usages)).toBe("Ética na IA (publicado), Redação");
  });
});

describe("activateTip", () => {
  function deps(overrides: Partial<ActivateDeps> = {}): ActivateDeps {
    return {
      getCurrentAdmin: vi.fn().mockResolvedValue(admin),
      findTip: vi.fn().mockResolvedValue(tip("t1")),
      categoryState: vi.fn().mockResolvedValue({ exists: true, active: true }),
      setStatus: vi.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  it("activates a tip whose category exists", async () => {
    const d = deps();
    await expect(activateTip("t1", d)).resolves.toMatchObject({ ok: true, warnings: [] });
    expect(d.setStatus).toHaveBeenCalledWith("t1", "active", "admin-1");
  });

  it("warns about an inactive category", async () => {
    const result = await activateTip("t1", deps({ categoryState: vi.fn().mockResolvedValue({ exists: true, active: false }) }));
    expect(result).toMatchObject({ ok: true, warnings: [expect.stringContaining("inativa")] });
  });

  it("refuses when the category is gone, the tip is gone or there is no session", async () => {
    const noCategory = deps({ categoryState: vi.fn().mockResolvedValue({ exists: false, active: false }) });
    expect(await activateTip("t1", noCategory)).toMatchObject({ ok: false, problems: [expect.stringContaining("categoria")] });
    expect(noCategory.setStatus).not.toHaveBeenCalled();
    expect(await activateTip("t1", deps({ findTip: vi.fn().mockResolvedValue(null) }))).toMatchObject({ ok: false });
    expect(await activateTip("t1", deps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) }))).toMatchObject({
      ok: false,
      message: SESSION_EXPIRED_MESSAGE,
    });
  });
});

describe("deactivateTip", () => {
  it("warns about published questionnaires that link to it", async () => {
    const result = await deactivateTip("t1", {
      getCurrentAdmin: vi.fn().mockResolvedValue(admin),
      findUsages: vi.fn().mockResolvedValue(usages),
      setStatus: vi.fn().mockResolvedValue(true),
    });
    expect(result).toMatchObject({ ok: true, warnings: [expect.stringContaining("Ética na IA (publicado)")] });
    if (result.ok) expect(result.warnings[0]).not.toContain("Redação");
  });

  it("has no warning when nothing published uses it", async () => {
    const result = await deactivateTip("t1", {
      getCurrentAdmin: vi.fn().mockResolvedValue(admin),
      findUsages: vi.fn().mockResolvedValue([]),
      setStatus: vi.fn().mockResolvedValue(true),
    });
    expect(result).toEqual({ ok: true, message: "Dica desativada: saiu dos apps.", warnings: [] });
  });
});

describe("deleteTipById", () => {
  it("refuses while steps link to the tip", async () => {
    const remove = vi.fn();
    const result = await deleteTipById("t1", { getCurrentAdmin: vi.fn().mockResolvedValue(admin), findUsages: vi.fn().mockResolvedValue(usages), remove });
    expect(result).toMatchObject({ ok: false, problems: ["Ética na IA (publicado), Redação"] });
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes an unused tip", async () => {
    const remove = vi.fn().mockResolvedValue(true);
    await expect(
      deleteTipById("t1", { getCurrentAdmin: vi.fn().mockResolvedValue(admin), findUsages: vi.fn().mockResolvedValue([]), remove }),
    ).resolves.toMatchObject({ ok: true });
    expect(remove).toHaveBeenCalledWith("t1");
  });
});
