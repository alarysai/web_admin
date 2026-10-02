import type { AdminSession } from "@/features/auth/domain/admin-session";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/forms/action-result";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/forms/form-state";

import type { Tip, TipStatus, TipUsage } from "../domain/tip";

export type TipActionResult = ActionResult;

const GONE = "Esta dica não existe mais.";

/** "Ética na IA (publicado), Redação" — each questionnaire once. */
export function describeUsages(usages: TipUsage[]): string {
  const byQuestionnaire = new Map<string, TipUsage>();
  usages.forEach((usage) => byQuestionnaire.set(usage.questionnaireId, usage));
  return [...byQuestionnaire.values()]
    .map((usage) => `${usage.questionnaireTitle}${usage.published ? " (publicado)" : ""}`)
    .join(", ");
}

type AdminDeps = { getCurrentAdmin: () => Promise<AdminSession | null> };

export type ActivateDeps = AdminDeps & {
  findTip: (id: string) => Promise<Tip | null>;
  categoryState: (categoryId: string) => Promise<{ exists: boolean; active: boolean }>;
  setStatus: (id: string, status: TipStatus, adminUid: string) => Promise<boolean>;
};

/** Activating shows the tip in the apps; it needs an existing category (an inactive one is a warning). */
export async function activateTip(id: string, deps: ActivateDeps): Promise<TipActionResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return actionFailure(SESSION_EXPIRED_MESSAGE);

  const tip = await deps.findTip(id);
  if (!tip) return actionFailure(GONE);

  const category = await deps.categoryState(tip.categoryId);
  if (!category.exists) {
    return actionFailure("Ainda não dá para ativar:", ["A categoria da dica não existe mais. Escolha outra."]);
  }

  if (!(await deps.setStatus(id, "active", admin.uid))) return actionFailure(GONE);
  const warnings = category.active ? [] : ["A categoria está inativa: a dica só aparece no app quando ela for ativada."];
  return actionSuccess("Dica ativada: já aparece nos apps.", warnings);
}

export type DeactivateDeps = AdminDeps & {
  findUsages: (id: string) => Promise<TipUsage[]>;
  setStatus: (id: string, status: TipStatus, adminUid: string) => Promise<boolean>;
};

/** Deactivating hides the tip; published questionnaires that link to it are reported as a warning. */
export async function deactivateTip(id: string, deps: DeactivateDeps): Promise<TipActionResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return actionFailure(SESSION_EXPIRED_MESSAGE);

  const [updated, usages] = await Promise.all([deps.setStatus(id, "inactive", admin.uid), deps.findUsages(id)]);
  if (!updated) return actionFailure(GONE);

  const published = usages.filter((usage) => usage.published);
  const warnings = published.length
    ? [`Questionários publicados que ligam a esta dica deixam de mostrá-la: ${describeUsages(published)}.`]
    : [];
  return actionSuccess("Dica desativada: saiu dos apps.", warnings);
}

export type DeleteTipDeps = AdminDeps & {
  findUsages: (id: string) => Promise<TipUsage[]>;
  remove: (id: string) => Promise<boolean>;
};

/** Refused while any step links to the tip, so no questionnaire is left pointing to a missing tip. */
export async function deleteTipById(id: string, deps: DeleteTipDeps): Promise<TipActionResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return actionFailure(SESSION_EXPIRED_MESSAGE);

  const usages = await deps.findUsages(id);
  if (usages.length > 0) {
    return actionFailure("Esta dica está ligada a passos de questionários. Remova a ligação antes de excluir:", [describeUsages(usages)]);
  }

  if (!(await deps.remove(id))) return actionFailure(GONE);
  return actionSuccess("Dica excluída.");
}
