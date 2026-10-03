import type { AdminSession } from "@/features/auth/domain/admin-session";
import { formError, SESSION_EXPIRED_MESSAGE, zodFieldErrors, type FormState } from "@/lib/forms/form-state";
import {
  formValues,
  readInteger,
  readLocalizedText,
  readOptionalInteger,
  readOptionalLocalizedText,
  readString,
} from "@/lib/forms/form-data";

import { questionnaireInputSchema, type QuestionnaireInput } from "../domain/schemas";

export type SaveQuestionnaireDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  categoryExists: (categoryId: string) => Promise<boolean>;
  create: (input: QuestionnaireInput, adminUid: string) => Promise<string>;
  update: (id: string, input: QuestionnaireInput, adminUid: string) => Promise<boolean>;
};

export type SaveQuestionnaireResult = { ok: true; id: string; created: boolean } | { ok: false; state: FormState };

export { SESSION_EXPIRED_MESSAGE };

export function readQuestionnaireForm(formData: FormData) {
  return {
    title: readLocalizedText(formData, "title"),
    description: readOptionalLocalizedText(formData, "description"),
    categoryId: readString(formData, "categoryId"),
    order: readInteger(formData, "order"),
    creditCost: readOptionalInteger(formData, "creditCost"),
  };
}

/**
 * Create (id = null) or update a questionnaire from the form. Server Actions
 * are reachable by direct POST, so the admin check happens here, every time.
 */
export async function saveQuestionnaire(
  id: string | null,
  formData: FormData,
  deps: SaveQuestionnaireDeps,
): Promise<SaveQuestionnaireResult> {
  const values = formValues(formData);

  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, state: formError(SESSION_EXPIRED_MESSAGE, values) };

  const parsed = questionnaireInputSchema.safeParse(readQuestionnaireForm(formData));
  if (!parsed.success) {
    return { ok: false, state: formError("Revise os campos destacados.", values, zodFieldErrors(parsed.error)) };
  }

  if (!(await deps.categoryExists(parsed.data.categoryId))) {
    return {
      ok: false,
      state: formError("Revise os campos destacados.", values, { categoryId: "Categoria não encontrada." }),
    };
  }

  if (id === null) {
    const newId = await deps.create(parsed.data, admin.uid);
    return { ok: true, id: newId, created: true };
  }

  const updated = await deps.update(id, parsed.data, admin.uid);
  if (!updated) return { ok: false, state: formError("Este questionário não existe mais.", values) };
  return { ok: true, id, created: false };
}
