import type { AdminSession } from "@/features/auth/domain/admin-session";
import { formValues, readInteger, readLocalizedText, readString } from "@/lib/forms/form-data";
import { formError, zodFieldErrors, type FormState } from "@/lib/forms/form-state";

import { categoryInputSchema, type CategoryInput } from "../domain/category";

export type SaveCategoryDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  create: (input: CategoryInput, adminUid: string) => Promise<string>;
  update: (id: string, input: CategoryInput, adminUid: string) => Promise<boolean>;
};

export type SaveCategoryResult = { ok: true; id: string; created: boolean } | { ok: false; state: FormState };

export function readCategoryForm(formData: FormData) {
  return {
    name: readLocalizedText(formData, "name"),
    order: readInteger(formData, "order"),
    status: readString(formData, "status"),
  };
}

/** Create (id = null) or update a questionnaire category. Checks the admin on every call. */
export async function saveCategory(id: string | null, formData: FormData, deps: SaveCategoryDeps): Promise<SaveCategoryResult> {
  const values = formValues(formData);

  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, state: formError("Sua sessão expirou. Entre de novo para salvar.", values) };

  const parsed = categoryInputSchema.safeParse(readCategoryForm(formData));
  if (!parsed.success) {
    return { ok: false, state: formError("Revise os campos destacados.", values, zodFieldErrors(parsed.error)) };
  }

  if (id === null) {
    return { ok: true, id: await deps.create(parsed.data, admin.uid), created: true };
  }

  const updated = await deps.update(id, parsed.data, admin.uid);
  if (!updated) return { ok: false, state: formError("Esta categoria não existe mais.", values) };
  return { ok: true, id, created: false };
}
