"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/auth/server/current-admin";
import { formSuccess, type FormState } from "@/lib/forms/form-state";

import { findQuestionnaire } from "../data/questionnaires-repository";
import { createStep, deleteStep, updateStep } from "../data/steps-repository";
import { deleteStepById, saveStep, type DeleteStepResult } from "./save-step";

function revalidateQuestionnaire(questionnaireId: string) {
  revalidatePath("/questionarios");
  revalidatePath(`/questionarios/${questionnaireId}`, "layout");
}

/** Bound with (questionnaireId, stepId | null) in StepForm. */
export async function saveStepAction(
  questionnaireId: string,
  stepId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await saveStep(questionnaireId, stepId, formData, {
    getCurrentAdmin,
    questionnaireExists: async (id) => (await findQuestionnaire(id)) !== null,
    create: createStep,
    update: updateStep,
  });

  if (!result.ok) return result.state;

  revalidateQuestionnaire(questionnaireId);
  if (result.created) redirect(`/questionarios/${questionnaireId}?passo=criado`);
  return formSuccess("Passo salvo.");
}

/** Bound with (questionnaireId, stepId) in DeleteStepButton. */
export async function deleteStepAction(questionnaireId: string, stepId: string): Promise<DeleteStepResult> {
  const result = await deleteStepById(questionnaireId, stepId, { getCurrentAdmin, remove: deleteStep });
  if (result.ok) revalidateQuestionnaire(questionnaireId);
  return result;
}
