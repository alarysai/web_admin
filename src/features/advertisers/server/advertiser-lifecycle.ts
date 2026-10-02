import type { AdminSession } from "@/features/auth/domain/admin-session";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/forms/action-result";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/forms/form-state";

import { advertiserInputSchema, type Advertiser, type AdvertiserStatus } from "../domain/advertiser";

const GONE = "Este anunciante não existe mais.";

type AdminDeps = { getCurrentAdmin: () => Promise<AdminSession | null> };

type StatusDeps = AdminDeps & {
  setStatus: (id: string, status: AdvertiserStatus, adminUid: string) => Promise<boolean>;
};

export type ActivateAdvertiserDeps = StatusDeps & {
  findAdvertiser: (id: string) => Promise<Advertiser | null>;
};

/**
 * Activating shows the advertiser in the apps. The saved data is checked
 * again (name or image, https link…) so malformed legacy data never goes live.
 */
export async function activateAdvertiser(id: string, deps: ActivateAdvertiserDeps): Promise<ActionResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return actionFailure(SESSION_EXPIRED_MESSAGE);

  const advertiser = await deps.findAdvertiser(id);
  if (!advertiser) return actionFailure(GONE);

  const check = advertiserInputSchema.safeParse(advertiser);
  if (!check.success) {
    return actionFailure("Ainda não dá para ativar:", [
      ...new Set(check.error.issues.map((issue) => issue.message)),
      "Corrija no formulário abaixo e salve.",
    ]);
  }

  if (!(await deps.setStatus(id, "active", admin.uid))) return actionFailure(GONE);
  return actionSuccess("Anunciante ativado: já aparece nos apps.");
}

export async function deactivateAdvertiser(id: string, deps: StatusDeps): Promise<ActionResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return actionFailure(SESSION_EXPIRED_MESSAGE);
  if (!(await deps.setStatus(id, "inactive", admin.uid))) return actionFailure(GONE);
  return actionSuccess("Anunciante desativado: saiu dos apps.");
}

export type DeleteAdvertiserDeps = AdminDeps & {
  remove: (id: string) => Promise<boolean>;
};

/** Nothing else references advertisers, so deleting needs only the admin check (and the UI confirmation). */
export async function deleteAdvertiserById(id: string, deps: DeleteAdvertiserDeps): Promise<ActionResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return actionFailure(SESSION_EXPIRED_MESSAGE);
  if (!(await deps.remove(id))) return actionFailure(GONE);
  return actionSuccess("Anunciante excluído.");
}
