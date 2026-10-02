"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/auth/server/current-admin";
import { findCategory } from "@/features/questionnaire-categories/data/categories-repository";
import { formSuccess, type FormState } from "@/lib/forms/form-state";

import {
  deleteQuestionnaireWithSteps,
  duplicateQuestionnaire,
  setQuestionnaireStatus,
} from "../data/questionnaire-lifecycle-repository";
import { createQuestionnaire, findQuestionnaire, updateQuestionnaire } from "../data/questionnaires-repository";
import { listSteps } from "../data/steps-repository";
import {
  deleteQuestionnaireById,
  duplicateQuestionnaireById,
  publishQuestionnaire,
  unpublishQuestionnaire,
  type LifecycleResult,
} from "./questionnaire-lifecycle";
import { saveQuestionnaire } from "./save-questionnaire";

/** Bound with the questionnaire id (null = new) in QuestionnaireForm. */
export async function saveQuestionnaireAction(
  id: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await saveQuestionnaire(id, formData, {
    getCurrentAdmin,
    categoryExists: async (categoryId) => (await findCategory(categoryId)) !== null,
    create: createQuestionnaire,
    update: updateQuestionnaire,
  });

  if (!result.ok) return result.state;

  revalidatePath("/questionarios");
  if (result.created) redirect(`/questionarios/${result.id}?criado=1`);
  revalidatePath(`/questionarios/${result.id}`);
  return formSuccess("Questionário salvo.");
}

// ---------- lifecycle: publish, unpublish, duplicate, delete ----------

function revalidateQuestionnaire(id: string) {
  revalidatePath("/questionarios");
  revalidatePath(`/questionarios/${id}`, "layout");
}

export async function publishQuestionnaireAction(id: string): Promise<LifecycleResult> {
  const result = await publishQuestionnaire(id, {
    getCurrentAdmin,
    findQuestionnaire,
    listSteps,
    categoryState: async (categoryId) => {
      const category = await findCategory(categoryId);
      return { exists: category !== null, active: category?.status === "active" };
    },
    setStatus: setQuestionnaireStatus,
  });
  if (result.ok) revalidateQuestionnaire(id);
  return result;
}

export async function unpublishQuestionnaireAction(id: string): Promise<LifecycleResult> {
  const result = await unpublishQuestionnaire(id, { getCurrentAdmin, setStatus: setQuestionnaireStatus });
  if (result.ok) revalidateQuestionnaire(id);
  return result;
}

/** On success, opens the copy (redirect); otherwise returns the error. */
export async function duplicateQuestionnaireAction(id: string): Promise<LifecycleResult> {
  const result = await duplicateQuestionnaireById(id, { getCurrentAdmin, duplicate: duplicateQuestionnaire });
  if (!result.ok) return { ok: false, message: result.message, problems: [] };
  revalidatePath("/questionarios");
  redirect(`/questionarios/${result.id}?copiado=1`);
}

/** On success, goes back to the list (redirect); otherwise returns the error. */
export async function deleteQuestionnaireAction(id: string): Promise<LifecycleResult> {
  const result = await deleteQuestionnaireById(id, { getCurrentAdmin, findQuestionnaire, deleteWithSteps: deleteQuestionnaireWithSteps });
  if (!result.ok) return result;
  revalidatePath("/questionarios");
  redirect("/questionarios?excluido=1");
}
