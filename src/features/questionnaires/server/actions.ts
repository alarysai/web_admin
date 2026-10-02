"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/auth/server/current-admin";
import { findCategory } from "@/features/questionnaire-categories/data/categories-repository";
import { formSuccess, type FormState } from "@/lib/forms/form-state";

import { createQuestionnaire, updateQuestionnaire } from "../data/questionnaires-repository";
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
