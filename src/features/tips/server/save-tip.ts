import type { AdminSession } from "@/features/auth/domain/admin-session";
import { formValues, readInteger, readLocalizedText, readString } from "@/lib/forms/form-data";
import { formError, SESSION_EXPIRED_MESSAGE, zodFieldErrors, type FormState } from "@/lib/forms/form-state";

import { tipInputSchema, type TipInput } from "../domain/tip";

export type SaveTipDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  categoryExists: (categoryId: string) => Promise<boolean>;
  create: (input: TipInput, adminUid: string) => Promise<string>;
  update: (id: string, input: TipInput, adminUid: string) => Promise<boolean>;
};

export type SaveTipResult = { ok: true; id: string; created: boolean } | { ok: false; state: FormState };

export function readTipForm(formData: FormData) {
  return {
    categoryId: readString(formData, "categoryId"),
    text: readLocalizedText(formData, "text"),
    order: readInteger(formData, "order"),
  };
}

/** Create (id = null) or update a tip. Checks the admin on every call. */
export async function saveTip(id: string | null, formData: FormData, deps: SaveTipDeps): Promise<SaveTipResult> {
  const values = formValues(formData);

  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, state: formError(SESSION_EXPIRED_MESSAGE, values) };

  const parsed = tipInputSchema.safeParse(readTipForm(formData));
  if (!parsed.success) {
    return { ok: false, state: formError("Revise os campos destacados.", values, zodFieldErrors(parsed.error)) };
  }

  if (!(await deps.categoryExists(parsed.data.categoryId))) {
    return { ok: false, state: formError("Revise os campos destacados.", values, { categoryId: "Categoria não encontrada." }) };
  }

  if (id === null) return { ok: true, id: await deps.create(parsed.data, admin.uid), created: true };

  const updated = await deps.update(id, parsed.data, admin.uid);
  if (!updated) return { ok: false, state: formError("Esta dica não existe mais.", values) };
  return { ok: true, id, created: false };
}
