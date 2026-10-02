import type { AdminSession } from "@/features/auth/domain/admin-session";
import { formValues } from "@/lib/forms/form-data";
import { formError, zodFieldErrors, type FormState } from "@/lib/forms/form-state";

import { stepSchema, type Step } from "../domain/schemas";
import { SESSION_EXPIRED_MESSAGE } from "./save-questionnaire";
import { errorsByOptionId, optionIds, readStepForm } from "./step-form";

export type SaveStepDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  questionnaireExists: (questionnaireId: string) => Promise<boolean>;
  create: (questionnaireId: string, step: Step, adminUid: string) => Promise<string>;
  update: (questionnaireId: string, stepId: string, step: Step, adminUid: string) => Promise<boolean>;
};

export type SaveStepResult = { ok: true; stepId: string; created: boolean } | { ok: false; state: FormState };

/** Create (stepId = null) or update a step. Checks the admin on every call. */
export async function saveStep(
  questionnaireId: string,
  stepId: string | null,
  formData: FormData,
  deps: SaveStepDeps,
): Promise<SaveStepResult> {
  const values = formValues(formData);

  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, state: formError(SESSION_EXPIRED_MESSAGE, values) };

  const parsed = stepSchema.safeParse(readStepForm(formData));
  if (!parsed.success) {
    const errors = errorsByOptionId(zodFieldErrors(parsed.error), optionIds(formData));
    return { ok: false, state: formError("Revise os campos destacados.", values, errors) };
  }

  if (!(await deps.questionnaireExists(questionnaireId))) {
    return { ok: false, state: formError("Este questionário não existe mais.", values) };
  }

  if (stepId === null) {
    return { ok: true, stepId: await deps.create(questionnaireId, parsed.data, admin.uid), created: true };
  }

  const updated = await deps.update(questionnaireId, stepId, parsed.data, admin.uid);
  if (!updated) return { ok: false, state: formError("Este passo não existe mais.", values) };
  return { ok: true, stepId, created: false };
}

export type DeleteStepDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  remove: (questionnaireId: string, stepId: string, adminUid: string) => Promise<boolean>;
};

export type DeleteStepResult = { ok: true } | { ok: false; message: string };

export async function deleteStepById(questionnaireId: string, stepId: string, deps: DeleteStepDeps): Promise<DeleteStepResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, message: SESSION_EXPIRED_MESSAGE };

  const removed = await deps.remove(questionnaireId, stepId, admin.uid);
  return removed ? { ok: true } : { ok: false, message: "Este passo já tinha sido excluído." };
}
