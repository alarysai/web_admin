import { describe, expect, it, vi } from "vitest";

import { SESSION_EXPIRED_MESSAGE } from "./save-questionnaire";
import { deleteStepById, saveStep, type DeleteStepDeps, type SaveStepDeps } from "./save-step";

const admin = { uid: "admin-1", email: null };

function videoForm(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const entries: Record<string, string> = {
    type: "video",
    order: "1",
    "text.pt": "Assista",
    "text.en": "",
    "text.es": "",
    videoUrl: "https://youtu.be/abc",
    nextStepId: "",
    promptInstruction: "",
    ...overrides,
  };
  Object.entries(entries).forEach(([key, value]) => data.append(key, value));
  return data;
}

function deps(overrides: Partial<SaveStepDeps> = {}): SaveStepDeps {
  return {
    getCurrentAdmin: vi.fn().mockResolvedValue(admin),
    questionnaireExists: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue("new-step"),
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("saveStep", () => {
  it("creates a valid video step", async () => {
    const d = deps();
    await expect(saveStep("q1", null, videoForm(), d)).resolves.toEqual({ ok: true, stepId: "new-step", created: true });
    expect(d.create).toHaveBeenCalledWith(
      "q1",
      expect.objectContaining({ type: "video", videoUrl: "https://youtu.be/abc", options: [], partOfPrompt: false }),
      "admin-1",
    );
  });

  it("updates an existing step", async () => {
    const d = deps();
    await expect(saveStep("q1", "s1", videoForm(), d)).resolves.toEqual({ ok: true, stepId: "s1", created: false });
    expect(d.update).toHaveBeenCalledWith("q1", "s1", expect.objectContaining({ order: 1 }), "admin-1");
  });

  it("refuses without an admin session", async () => {
    const d = deps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) });
    expect(await saveStep("q1", null, videoForm(), d)).toMatchObject({ ok: false, state: { message: SESSION_EXPIRED_MESSAGE } });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("reports option errors by option id", async () => {
    const data = new FormData();
    [
      ["type", "question"],
      ["order", "1"],
      ["text.pt", "Qual?"],
      ["options.ok.id", "ok"],
      ["options.ok.text.pt", "Sim"],
      ["options.bad.id", "bad"],
      ["options.bad.text.pt", ""],
      ["options.bad.text.en", "Only English"],
    ].forEach(([key, value]) => data.append(key, value));

    const result = await saveStep("q1", null, data, deps());
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { "options.bad.text.pt": "Obrigatório em português." } } });
  });

  it("requires the video link and a text", async () => {
    const result = await saveStep("q1", null, videoForm({ videoUrl: "", "text.pt": "" }), deps());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.state.fieldErrors).toMatchObject({ videoUrl: "Informe o link do vídeo.", text: expect.any(String) });
  });

  it("refuses when the questionnaire was deleted", async () => {
    const d = deps({ questionnaireExists: vi.fn().mockResolvedValue(false) });
    expect(await saveStep("gone", null, videoForm(), d)).toMatchObject({ ok: false, state: { message: "Este questionário não existe mais." } });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("reports a step deleted meanwhile", async () => {
    const d = deps({ update: vi.fn().mockResolvedValue(false) });
    expect(await saveStep("q1", "gone", videoForm(), d)).toMatchObject({ ok: false, state: { message: "Este passo não existe mais." } });
  });
});

describe("deleteStepById", () => {
  function deleteDeps(overrides: Partial<DeleteStepDeps> = {}): DeleteStepDeps {
    return { getCurrentAdmin: vi.fn().mockResolvedValue(admin), remove: vi.fn().mockResolvedValue(true), ...overrides };
  }

  it("deletes as the current admin", async () => {
    const d = deleteDeps();
    await expect(deleteStepById("q1", "s1", d)).resolves.toEqual({ ok: true });
    expect(d.remove).toHaveBeenCalledWith("q1", "s1", "admin-1");
  });

  it("refuses without an admin session", async () => {
    const d = deleteDeps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) });
    await expect(deleteStepById("q1", "s1", d)).resolves.toEqual({ ok: false, message: SESSION_EXPIRED_MESSAGE });
    expect(d.remove).not.toHaveBeenCalled();
  });

  it("tells when the step was already gone", async () => {
    const d = deleteDeps({ remove: vi.fn().mockResolvedValue(false) });
    await expect(deleteStepById("q1", "s1", d)).resolves.toEqual({ ok: false, message: "Este passo já tinha sido excluído." });
  });
});
