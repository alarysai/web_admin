import type { AdminSession } from "@/features/auth/domain/admin-session";
import { formValues, readInteger, readString } from "@/lib/forms/form-data";
import { formError, SESSION_EXPIRED_MESSAGE, zodFieldErrors, type FormState } from "@/lib/forms/form-state";

import { advertiserInputSchema, type AdvertiserInput } from "../domain/advertiser";

export type SaveAdvertiserDeps = {
  getCurrentAdmin: () => Promise<AdminSession | null>;
  create: (input: AdvertiserInput, adminUid: string) => Promise<string>;
  update: (id: string, input: AdvertiserInput, adminUid: string) => Promise<boolean>;
};

export type SaveAdvertiserResult = { ok: true; id: string; created: boolean } | { ok: false; state: FormState };

export function readAdvertiserForm(formData: FormData) {
  return {
    name: readString(formData, "name"),
    // Uploads arrive with Storage; until then the form never sends an image.
    image: null,
    type: readString(formData, "type"),
    link: readString(formData, "link"),
    order: readInteger(formData, "order"),
  };
}

/** Create (id = null) or update an advertiser. Checks the admin on every call. */
export async function saveAdvertiser(id: string | null, formData: FormData, deps: SaveAdvertiserDeps): Promise<SaveAdvertiserResult> {
  const values = formValues(formData);

  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, state: formError(SESSION_EXPIRED_MESSAGE, values) };

  const parsed = advertiserInputSchema.safeParse(readAdvertiserForm(formData));
  if (!parsed.success) {
    return { ok: false, state: formError("Revise os campos destacados.", values, zodFieldErrors(parsed.error)) };
  }

  if (id === null) return { ok: true, id: await deps.create(parsed.data, admin.uid), created: true };

  const updated = await deps.update(id, parsed.data, admin.uid);
  if (!updated) return { ok: false, state: formError("Este anunciante não existe mais.", values) };
  return { ok: true, id, created: false };
}
