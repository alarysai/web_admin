import { describe, expect, it, vi } from "vitest";

import { toCategory } from "./data/category-mapper";
import { categoryInputSchema, sortCategories, type QuestionnaireCategory } from "./domain/category";
import { saveCategory, type SaveCategoryDeps } from "./server/save-category";

function category(id: string, order: number, pt: string): QuestionnaireCategory {
  return { id, name: { pt, en: null, es: null }, order, status: "active", updatedAt: null };
}

function form(entries: Record<string, string>) {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.append(key, value));
  return data;
}

describe("categoryInputSchema", () => {
  it("accepts a valid category", () => {
    expect(categoryInputSchema.parse({ name: { pt: "Ética", en: "Ethics", es: "" }, order: 0, status: "inactive" })).toEqual({
      name: { pt: "Ética", en: "Ethics", es: null },
      order: 0,
      status: "inactive",
    });
  });

  it("rejects an unknown status", () => {
    expect(categoryInputSchema.safeParse({ name: { pt: "x", en: "", es: "" }, order: 0, status: "published" }).success).toBe(false);
  });
});

describe("sortCategories", () => {
  it("orders by order, then name", () => {
    const sorted = sortCategories([category("c", 2, "B"), category("b", 1, "Z"), category("a", 2, "A")]);
    expect(sorted.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });
});

describe("toCategory", () => {
  it("treats an unknown status as inactive", () => {
    expect(toCategory("c1", { name: { pt: "Ética" }, status: "on" })).toMatchObject({ status: "inactive", order: 0 });
  });
});

describe("saveCategory", () => {
  const admin = { uid: "admin-1", email: null };
  const valid = () => form({ "name.pt": "Ética", "name.en": "", "name.es": "", order: "1", status: "active" });

  function deps(overrides: Partial<SaveCategoryDeps> = {}): SaveCategoryDeps {
    return {
      getCurrentAdmin: vi.fn().mockResolvedValue(admin),
      create: vi.fn().mockResolvedValue("new-cat"),
      update: vi.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  it("creates and updates", async () => {
    const d = deps();
    await expect(saveCategory(null, valid(), d)).resolves.toEqual({ ok: true, id: "new-cat", created: true });
    await expect(saveCategory("c1", valid(), d)).resolves.toEqual({ ok: true, id: "c1", created: false });
    expect(d.update).toHaveBeenCalledWith("c1", { name: { pt: "Ética", en: null, es: null }, order: 1, status: "active" }, "admin-1");
  });

  it("refuses without an admin session", async () => {
    const d = deps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) });
    expect((await saveCategory(null, valid(), d)).ok).toBe(false);
    expect(d.create).not.toHaveBeenCalled();
  });

  it("returns field errors", async () => {
    const data = valid();
    data.set("order", "");
    const result = await saveCategory(null, data, deps());
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { order: "Informe a ordem." } } });
  });

  it("reports a category deleted meanwhile", async () => {
    const result = await saveCategory("gone", valid(), deps({ update: vi.fn().mockResolvedValue(false) }));
    expect(result).toMatchObject({ ok: false, state: { message: "Esta categoria não existe mais." } });
  });
});
