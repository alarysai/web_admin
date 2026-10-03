import { describe, expect, it, vi } from "vitest";

import type { StepRecord } from "../domain/steps";
import { SESSION_EXPIRED_MESSAGE } from "./save-questionnaire";
import { deleteStepById, saveStep, type DeleteStepDeps, type SaveStepDeps } from "./save-step";
import { DEFAULT_ANSWER_FIELDS } from "../domain/schemas";

const admin = { uid: "admin-1", email: null };

function existingStep(id: string, overrides: Partial<StepRecord> = {}): StepRecord {
  return {
    id,
    order: 1,
    type: "video",
    text: { pt: id, en: null, es: null },
    image: null,
    videoUrl: "https://youtu.be/x",
    options: [],
    nextStepId: null,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
    ...overrides,
  };
}

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
    listSteps: vi.fn().mockResolvedValue([existingStep("s1")]),
    tipExists: vi.fn().mockResolvedValue(true),
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

  it("rejects a link to a tip that does not exist", async () => {
    const d = deps({ tipExists: vi.fn().mockResolvedValue(false) });
    const data = videoForm();
    data.append("infoFlag.enabled", "on");
    data.append("infoFlag.label.pt", "Isso é ético?");
    data.append("infoFlag.value", "true");
    data.append("infoFlag.tipId", "gone");
    const result = await saveStep("q1", "s1", data, d);
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { "infoFlag.tipId": expect.stringContaining("Dica não encontrada") } } });
    expect(d.tipExists).toHaveBeenCalledWith("gone");
    expect(d.update).not.toHaveBeenCalled();
  });

  it("rejects an option tip that does not exist, on that option's field", async () => {
    const tipExists = vi.fn(async (tipId: string) => tipId !== "gone");
    const data = new FormData();
    [
      ["type", "question"],
      ["order", "1"],
      ["text.pt", "Qual?"],
      ["options.a.id", "a"],
      ["options.a.text.pt", "Sim"],
      ["options.a.tipId", "gone"],
      ["options.b.id", "b"],
      ["options.b.text.pt", "Não"],
      ["options.b.tipId", "ok"],
    ].forEach(([key, value]) => data.append(key, value));
    const result = await saveStep("q1", null, data, deps({ tipExists }));
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { "options.a.tipId": expect.stringContaining("Dica não encontrada") } } });
    if (!result.ok) expect(result.state.fieldErrors["options.b.tipId"]).toBeUndefined();
  });

  it("reports answer-type errors on the right field", async () => {
    const data = new FormData();
    [
      ["type", "question"],
      ["order", "1"],
      ["text.pt", "Sim ou não?"],
      ["answerType", "yes_no"],
      ["options.a.id", "a"],
      ["options.a.text.pt", "Sim"],
    ].forEach(([key, value]) => data.append(key, value));
    const result = await saveStep("q1", null, data, deps());
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { options: expect.stringContaining("exatamente 2") } } });
  });

  it("reports a step deleted meanwhile", async () => {
    const d = deps();
    expect(await saveStep("q1", "gone", videoForm(), d)).toMatchObject({ ok: false, state: { message: "Este passo não existe mais." } });
    expect(d.update).not.toHaveBeenCalled();
  });

  it("saves jumps to existing steps and to the end", async () => {
    const d = deps({ listSteps: vi.fn().mockResolvedValue([existingStep("s1"), existingStep("s2", { order: 2 })]) });
    expect((await saveStep("q1", "s1", videoForm({ nextStepId: "__end__" }), d)).ok).toBe(true);
    expect((await saveStep("q1", "s1", videoForm({ nextStepId: "s2" }), d)).ok).toBe(true);
  });

  it("rejects a jump to a step that does not exist", async () => {
    const d = deps();
    const result = await saveStep("q1", "s1", videoForm({ nextStepId: "ghost" }), d);
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { nextStepId: expect.stringMatching(/não encontrado/) } } });
    expect(d.update).not.toHaveBeenCalled();
  });

  it("rejects an option jump to a missing step, on that option's field", async () => {
    const data = new FormData();
    [
      ["type", "question"],
      ["order", "1"],
      ["text.pt", "Qual?"],
      ["options.a.id", "a"],
      ["options.a.text.pt", "Sim"],
      ["options.a.nextStepId", "ghost"],
    ].forEach(([key, value]) => data.append(key, value));
    const result = await saveStep("q1", null, data, deps());
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { "options.a.nextStepId": expect.any(String) } } });
  });

  it("rejects a jump that creates a cycle, naming it with step orders", async () => {
    // s1 (#1) goes to s2 (#2) by order; making s2 jump back to s1 closes a loop.
    const d = deps({ listSteps: vi.fn().mockResolvedValue([existingStep("s1"), existingStep("s2", { order: 2 })]) });
    const result = await saveStep("q1", "s2", videoForm({ order: "2", nextStepId: "s1" }), d);
    expect(result).toMatchObject({ ok: false, state: { message: expect.stringContaining("#1 → #2 → #1") } });
    expect(d.update).not.toHaveBeenCalled();
  });

  it("rejects a step jumping to itself", async () => {
    const result = await saveStep("q1", "s1", videoForm({ nextStepId: "s1" }), deps());
    expect(result).toMatchObject({ ok: false, state: { message: expect.stringContaining("ciclo") } });
  });

  it("rejects removing a jump when following the order would loop", async () => {
    // s2 (#2) jumps back to s1 (#1); s1 ends the questionnaire, so it is valid.
    // Changing s1 to "follow the order" sends it to s2, which comes back to s1.
    const steps = [existingStep("s1", { order: 1, nextStepId: "__end__" }), existingStep("s2", { order: 2, nextStepId: "s1" })];
    const d = deps({ listSteps: vi.fn().mockResolvedValue(steps) });
    const result = await saveStep("q1", "s1", videoForm({ order: "1", nextStepId: "" }), d);
    expect(result).toMatchObject({ ok: false, state: { message: expect.stringContaining("ciclo") } });
  });

  it("rejects a new order that creates a cycle", async () => {
    // s1 (#1) jumps to s3; s3 (#3) follows the order to the end. Moving s3 to #0
    // makes it follow the order into s1, which jumps back to s3.
    const steps = [existingStep("s1", { order: 1, nextStepId: "s3" }), existingStep("s3", { order: 3 })];
    const d = deps({ listSteps: vi.fn().mockResolvedValue(steps) });
    const result = await saveStep("q1", "s3", videoForm({ order: "0" }), d);
    expect(result).toMatchObject({ ok: false, state: { message: expect.stringContaining("ciclo") } });
  });

  it("does not block unrelated edits when the flow already had a cycle", async () => {
    const steps = [
      existingStep("s1", { order: 1, nextStepId: "s2" }),
      existingStep("s2", { order: 2, nextStepId: "s1" }),
      existingStep("s3", { order: 3 }),
    ];
    const d = deps({ listSteps: vi.fn().mockResolvedValue(steps) });
    expect((await saveStep("q1", "s3", videoForm({ order: "3" }), d)).ok).toBe(true);
  });
});

describe("deleteStepById", () => {
  function deleteDeps(overrides: Partial<DeleteStepDeps> = {}): DeleteStepDeps {
    return {
      getCurrentAdmin: vi.fn().mockResolvedValue(admin),
      isPublished: vi.fn().mockResolvedValue(false),
      listSteps: vi.fn().mockResolvedValue([existingStep("s1")]),
      remove: vi.fn().mockResolvedValue(true),
      ...overrides,
    };
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

  it("refuses a deletion that would create a cycle", async () => {
    // #1 jumps to #2 (the one deleted); #3 jumps back to #1. After deleting #2,
    // #1 follows the order to #3, and #3 goes back to #1.
    const steps = [
      existingStep("s1", { order: 1, nextStepId: "s2" }),
      existingStep("s2", { order: 2, nextStepId: "__end__" }),
      existingStep("s3", { order: 3, nextStepId: "s1" }),
    ];
    const d = deleteDeps({ listSteps: vi.fn().mockResolvedValue(steps) });
    const result = await deleteStepById("q1", "s2", d);
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("#1 → #3 → #1") });
    expect(d.remove).not.toHaveBeenCalled();
  });

  it("refuses to delete the only step of a published questionnaire", async () => {
    const d = deleteDeps({ isPublished: vi.fn().mockResolvedValue(true) });
    const result = await deleteStepById("q1", "s1", d);
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("Despublique") });
    expect(d.remove).not.toHaveBeenCalled();
  });

  it("deletes a step of a published questionnaire that has others", async () => {
    const d = deleteDeps({
      isPublished: vi.fn().mockResolvedValue(true),
      listSteps: vi.fn().mockResolvedValue([existingStep("s1"), existingStep("s2", { order: 2 })]),
    });
    await expect(deleteStepById("q1", "s1", d)).resolves.toEqual({ ok: true });
  });

  it("tells when the step was already gone", async () => {
    const d = deleteDeps({ remove: vi.fn().mockResolvedValue(false) });
    await expect(deleteStepById("q1", "s1", d)).resolves.toEqual({ ok: false, message: "Este passo já tinha sido excluído." });
  });
});
