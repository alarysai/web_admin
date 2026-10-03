import { describe, expect, it, vi } from "vitest";

import { saveQuestionnaire, SESSION_EXPIRED_MESSAGE, type SaveQuestionnaireDeps } from "./save-questionnaire";

const admin = { uid: "admin-1", email: "admin@alarys.com" };

function form(entries: Record<string, string>) {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.append(key, value));
  return data;
}

const validForm = () =>
  form({
    "title.pt": "Ética na IA",
    "title.en": "AI ethics",
    "title.es": "",
    "description.pt": "",
    "description.en": "",
    "description.es": "",
    categoryId: "c1",
    order: "2",
  });

function deps(overrides: Partial<SaveQuestionnaireDeps> = {}): SaveQuestionnaireDeps {
  return {
    getCurrentAdmin: vi.fn().mockResolvedValue(admin),
    categoryExists: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue("new-id"),
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const expectedInput = {
  title: { pt: "Ética na IA", en: "AI ethics", es: null },
  description: null,
  categoryId: "c1",
  order: 2,
  creditCost: null,
};

describe("saveQuestionnaire", () => {
  it("creates a questionnaire with the admin as author", async () => {
    const d = deps();
    await expect(saveQuestionnaire(null, validForm(), d)).resolves.toEqual({ ok: true, id: "new-id", created: true });
    expect(d.create).toHaveBeenCalledWith(expectedInput, "admin-1");
  });

  it("updates an existing questionnaire", async () => {
    const d = deps();
    await expect(saveQuestionnaire("q1", validForm(), d)).resolves.toEqual({ ok: true, id: "q1", created: false });
    expect(d.update).toHaveBeenCalledWith("q1", expectedInput, "admin-1");
    expect(d.create).not.toHaveBeenCalled();
  });

  it("refuses to save without an active admin session", async () => {
    const d = deps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) });
    const result = await saveQuestionnaire(null, validForm(), d);
    expect(result).toMatchObject({ ok: false, state: { status: "error", message: SESSION_EXPIRED_MESSAGE } });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("returns field errors and echoes the submitted values", async () => {
    const data = validForm();
    data.set("title.pt", "");
    data.set("order", "-1");
    const result = await saveQuestionnaire(null, data, deps());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.state.fieldErrors).toMatchObject({ "title.pt": "Obrigatório em português.", order: "Use 0 ou mais." });
    expect(result.state.values).toMatchObject({ "title.en": "AI ethics", order: "-1" });
  });

  it("rejects a category that does not exist", async () => {
    const d = deps({ categoryExists: vi.fn().mockResolvedValue(false) });
    const result = await saveQuestionnaire(null, validForm(), d);
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { categoryId: "Categoria não encontrada." } } });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("reports when the questionnaire was deleted meanwhile", async () => {
    const d = deps({ update: vi.fn().mockResolvedValue(false) });
    const result = await saveQuestionnaire("gone", validForm(), d);
    expect(result).toMatchObject({ ok: false, state: { message: "Este questionário não existe mais." } });
  });
});
