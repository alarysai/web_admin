import { describe, expect, it, vi } from "vitest";

import type { Questionnaire } from "../domain/questionnaire";
import type { StepRecord } from "../domain/steps";
import {
  deleteQuestionnaireById,
  duplicateQuestionnaireById,
  publishQuestionnaire,
  unpublishQuestionnaire,
  type PublishDeps,
} from "./questionnaire-lifecycle";
import { SESSION_EXPIRED_MESSAGE } from "./save-questionnaire";

const admin = { uid: "admin-1", email: null };

const questionnaire = (status: Questionnaire["status"] = "draft"): Questionnaire => ({
  id: "q1",
  title: { pt: "Ética", en: null, es: null },
  description: null,
  categoryId: "c1",
  languages: ["pt"],
  order: 0,
  status,
  updatedAt: null,
});

const step: StepRecord = {
  id: "s1",
  order: 1,
  type: "video",
  text: { pt: "Assista", en: null, es: null },
  image: null,
  videoUrl: "https://youtu.be/x",
  options: [],
  nextStepId: null,
  partOfPrompt: false,
  promptInstruction: null,
  infoFlag: null,
};

function publishDeps(overrides: Partial<PublishDeps> = {}): PublishDeps {
  return {
    getCurrentAdmin: vi.fn().mockResolvedValue(admin),
    findQuestionnaire: vi.fn().mockResolvedValue(questionnaire()),
    listSteps: vi.fn().mockResolvedValue([step]),
    categoryState: vi.fn().mockResolvedValue({ exists: true, active: true }),
    setStatus: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("publishQuestionnaire", () => {
  it("publishes a valid questionnaire", async () => {
    const d = publishDeps();
    await expect(publishQuestionnaire("q1", d)).resolves.toMatchObject({ ok: true, warnings: [] });
    expect(d.setStatus).toHaveBeenCalledWith("q1", "published", "admin-1");
    expect(d.categoryState).toHaveBeenCalledWith("c1");
  });

  it("returns the problems and does not publish", async () => {
    const d = publishDeps({ listSteps: vi.fn().mockResolvedValue([]) });
    await expect(publishQuestionnaire("q1", d)).resolves.toEqual({
      ok: false,
      message: "Ainda não dá para publicar:",
      problems: ["Adicione ao menos um passo."],
    });
    expect(d.setStatus).not.toHaveBeenCalled();
  });

  it("passes the inactive-category warning along", async () => {
    const d = publishDeps({ categoryState: vi.fn().mockResolvedValue({ exists: true, active: false }) });
    const result = await publishQuestionnaire("q1", d);
    expect(result).toMatchObject({ ok: true, warnings: [expect.stringContaining("inativa")] });
  });

  it("refuses without an admin session or when the questionnaire is gone", async () => {
    expect(await publishQuestionnaire("q1", publishDeps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) }))).toMatchObject({
      ok: false,
      message: SESSION_EXPIRED_MESSAGE,
    });
    expect(await publishQuestionnaire("q1", publishDeps({ findQuestionnaire: vi.fn().mockResolvedValue(null) }))).toMatchObject({
      ok: false,
      message: "Este questionário não existe mais.",
    });
  });
});

describe("unpublishQuestionnaire", () => {
  it("turns it back into a draft", async () => {
    const setStatus = vi.fn().mockResolvedValue(true);
    await expect(unpublishQuestionnaire("q1", { getCurrentAdmin: vi.fn().mockResolvedValue(admin), setStatus })).resolves.toMatchObject({
      ok: true,
    });
    expect(setStatus).toHaveBeenCalledWith("q1", "draft", "admin-1");
  });

  it("refuses without an admin session", async () => {
    const setStatus = vi.fn();
    await unpublishQuestionnaire("q1", { getCurrentAdmin: vi.fn().mockResolvedValue(null), setStatus });
    expect(setStatus).not.toHaveBeenCalled();
  });
});

describe("duplicateQuestionnaireById", () => {
  it("returns the id of the copy", async () => {
    const duplicate = vi.fn().mockResolvedValue("copy-1");
    await expect(duplicateQuestionnaireById("q1", { getCurrentAdmin: vi.fn().mockResolvedValue(admin), duplicate })).resolves.toEqual({
      ok: true,
      id: "copy-1",
    });
    expect(duplicate).toHaveBeenCalledWith("q1", "admin-1");
  });

  it("reports a missing source and a missing session", async () => {
    expect(
      await duplicateQuestionnaireById("q1", { getCurrentAdmin: vi.fn().mockResolvedValue(admin), duplicate: vi.fn().mockResolvedValue(null) }),
    ).toEqual({ ok: false, message: "Este questionário não existe mais." });
    expect(await duplicateQuestionnaireById("q1", { getCurrentAdmin: vi.fn().mockResolvedValue(null), duplicate: vi.fn() })).toEqual({
      ok: false,
      message: SESSION_EXPIRED_MESSAGE,
    });
  });
});

describe("deleteQuestionnaireById", () => {
  const deps = (status: Questionnaire["status"]) => ({
    getCurrentAdmin: vi.fn().mockResolvedValue(admin),
    findQuestionnaire: vi.fn().mockResolvedValue(questionnaire(status)),
    deleteWithSteps: vi.fn().mockResolvedValue(true),
  });

  it("deletes a draft with its steps", async () => {
    const d = deps("draft");
    await expect(deleteQuestionnaireById("q1", d)).resolves.toMatchObject({ ok: true });
    expect(d.deleteWithSteps).toHaveBeenCalledWith("q1");
  });

  it("refuses to delete a published questionnaire", async () => {
    const d = deps("published");
    await expect(deleteQuestionnaireById("q1", d)).resolves.toMatchObject({ ok: false, message: "Despublique o questionário antes de excluir." });
    expect(d.deleteWithSteps).not.toHaveBeenCalled();
  });

  it("refuses without an admin session", async () => {
    const d = { ...deps("draft"), getCurrentAdmin: vi.fn().mockResolvedValue(null) };
    await deleteQuestionnaireById("q1", d);
    expect(d.deleteWithSteps).not.toHaveBeenCalled();
  });
});
