import type { AdminSession } from "@/features/auth/domain/admin-session";
import { formValues } from "@/lib/forms/form-data";
import { formError, zodFieldErrors, type FormState } from "@/lib/forms/form-state";

import { describeCycle, findCycle, stepsAfterDelete, validateFlow } from "../domain/flow";
import { stepSchema, type Step } from "../domain/schemas";
import { sortSteps, type StepRecord } from "../domain/steps";
import { SESSION_EXPIRED_MESSAGE } from "./save-questionnaire";
import { errorsByOptionId, optionIds, readStepForm } from "./step-form";

export type SaveStepDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  questionnaireExists: (questionnaireId: string) => Promise<boolean>;
  listSteps: (questionnaireId: string) => Promise<StepRecord[]>;
  create: (questionnaireId: string, step: Step, adminUid: string) => Promise<string>;
  update: (questionnaireId: string, stepId: string, step: Step, adminUid: string) => Promise<boolean>;
};

export type SaveStepResult = { ok: true; stepId: string; created: boolean } | { ok: false; state: FormState };

/** Placeholder id while a new step has no document id yet (nothing can jump to it). */
const NEW_STEP_ID = "__new__";

const TARGET_NOT_FOUND = "Passo não encontrado. Ele pode ter sido excluído; escolha outro destino.";

/**
 * Flow checks for saving `candidate` (docs/data-model.md → Fluxo e saltos):
 * its own jumps must point to existing steps, and the save must not create a
 * cycle. A cycle that already existed (legacy data) does not block unrelated
 * edits; the flow preview reports it.
 */
function flowErrors(candidate: StepRecord, existing: StepRecord[]) {
  const before = existing;
  const after = [...existing.filter((step) => step.id !== candidate.id), candidate];

  const fieldErrors: Record<string, string> = {};
  for (const issue of validateFlow(after)) {
    if (issue.kind !== "missing-target" || issue.stepId !== candidate.id) continue;
    fieldErrors[issue.optionId ? `options.${issue.optionId}.nextStepId` : "nextStepId"] = TARGET_NOT_FOUND;
  }

  const cycle = findCycle(sortSteps(after));
  const cycleMessage =
    cycle && !findCycle(sortSteps(before))
      ? `Este passo criaria um ciclo no fluxo (${describeCycle(cycle, after)}). Todo caminho precisa chegar ao fim: ajuste a ordem ou os saltos.`
      : null;

  return { fieldErrors, cycleMessage };
}

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

  const existing = await deps.listSteps(questionnaireId);
  if (stepId !== null && !existing.some((step) => step.id === stepId)) {
    return { ok: false, state: formError("Este passo não existe mais.", values) };
  }

  const { fieldErrors, cycleMessage } = flowErrors({ ...parsed.data, id: stepId ?? NEW_STEP_ID }, existing);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: formError("Revise os saltos destacados.", values, fieldErrors) };
  }
  if (cycleMessage) return { ok: false, state: formError(cycleMessage, values) };

  if (stepId === null) {
    return { ok: true, stepId: await deps.create(questionnaireId, parsed.data, admin.uid), created: true };
  }

  const updated = await deps.update(questionnaireId, stepId, parsed.data, admin.uid);
  if (!updated) return { ok: false, state: formError("Este passo não existe mais.", values) };
  return { ok: true, stepId, created: false };
}

export type DeleteStepDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  listSteps: (questionnaireId: string) => Promise<StepRecord[]>;
  remove: (questionnaireId: string, stepId: string, adminUid: string) => Promise<boolean>;
};

export type DeleteStepResult = { ok: true } | { ok: false; message: string };

/**
 * Deleting changes the flow too: jumps to the step fall back to "follow the
 * order", and the order neighbours change. Refused if that creates a cycle.
 */
export async function deleteStepById(questionnaireId: string, stepId: string, deps: DeleteStepDeps): Promise<DeleteStepResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, message: SESSION_EXPIRED_MESSAGE };

  const steps = await deps.listSteps(questionnaireId);
  const after = stepsAfterDelete(stepId, steps);
  const cycle = findCycle(sortSteps(after));
  if (cycle && !findCycle(sortSteps(steps))) {
    return {
      ok: false,
      message: `Excluir este passo criaria um ciclo no fluxo (${describeCycle(cycle, after)}). Ajuste os saltos antes de excluir.`,
    };
  }

  const removed = await deps.remove(questionnaireId, stepId, admin.uid);
  return removed ? { ok: true } : { ok: false, message: "Este passo já tinha sido excluído." };
}
