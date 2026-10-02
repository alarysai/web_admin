import type { AdminSession } from "@/features/auth/domain/admin-session";
import { actionFailure as failure, actionSuccess as success, type ActionResult } from "@/lib/forms/action-result";

import { checkPublishable, type CategoryState, type TipStates } from "../domain/lifecycle";
import type { Questionnaire } from "../domain/questionnaire";
import type { QuestionnaireStatus } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";
import { SESSION_EXPIRED_MESSAGE } from "./save-questionnaire";

export type LifecycleResult = ActionResult;

type AdminDeps = { getCurrentAdmin: () => Promise<AdminSession | null> };

const GONE = "Este questionário não existe mais.";

export type PublishDeps = AdminDeps & {
  findQuestionnaire: (id: string) => Promise<Questionnaire | null>;
  listSteps: (id: string) => Promise<StepRecord[]>;
  categoryState: (categoryId: string) => Promise<CategoryState>;
  tipStates: () => Promise<TipStates>;
  setStatus: (id: string, status: QuestionnaireStatus, adminUid: string) => Promise<boolean>;
};

/** Publishes after checkPublishable passes (steps, schema, flow, category, linked tips). */
export async function publishQuestionnaire(id: string, deps: PublishDeps): Promise<LifecycleResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return failure(SESSION_EXPIRED_MESSAGE);

  const questionnaire = await deps.findQuestionnaire(id);
  if (!questionnaire) return failure(GONE);

  const [steps, category, tips] = await Promise.all([
    deps.listSteps(id),
    deps.categoryState(questionnaire.categoryId),
    deps.tipStates(),
  ]);
  const check = checkPublishable(steps, category, tips);
  if (!check.ok) return failure("Ainda não dá para publicar:", check.problems);

  if (!(await deps.setStatus(id, "published", admin.uid))) return failure(GONE);
  return success("Questionário publicado: já aparece nos apps.", check.warnings);
}

export type UnpublishDeps = AdminDeps & {
  setStatus: (id: string, status: QuestionnaireStatus, adminUid: string) => Promise<boolean>;
};

export async function unpublishQuestionnaire(id: string, deps: UnpublishDeps): Promise<LifecycleResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return failure(SESSION_EXPIRED_MESSAGE);
  if (!(await deps.setStatus(id, "draft", admin.uid))) return failure(GONE);
  return success("Questionário despublicado: voltou a ser rascunho e saiu dos apps.");
}

export type DuplicateDeps = AdminDeps & {
  duplicate: (id: string, adminUid: string) => Promise<string | null>;
};

export type DuplicateResult = { ok: true; id: string } | { ok: false; message: string };

export async function duplicateQuestionnaireById(id: string, deps: DuplicateDeps): Promise<DuplicateResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
  const copyId = await deps.duplicate(id, admin.uid);
  return copyId ? { ok: true, id: copyId } : { ok: false, message: GONE };
}

export type DeleteDeps = AdminDeps & {
  findQuestionnaire: (id: string) => Promise<Questionnaire | null>;
  deleteWithSteps: (id: string) => Promise<boolean>;
};

/** Only drafts can be deleted, so a click never removes something the apps are showing. */
export async function deleteQuestionnaireById(id: string, deps: DeleteDeps): Promise<LifecycleResult> {
  const admin = await deps.getCurrentAdmin();
  if (!admin) return failure(SESSION_EXPIRED_MESSAGE);

  const questionnaire = await deps.findQuestionnaire(id);
  if (!questionnaire) return failure(GONE);
  if (questionnaire.status === "published") {
    return failure("Despublique o questionário antes de excluir.");
  }

  if (!(await deps.deleteWithSteps(id))) return failure(GONE);
  return success("Questionário excluído.");
}
