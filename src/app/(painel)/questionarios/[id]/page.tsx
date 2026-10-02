import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listCategories } from "@/features/categories/data/categories-repository";
import { categoryOptions } from "@/features/categories/domain/category";
import { findQuestionnaire } from "@/features/questionnaires/data/questionnaires-repository";
import { listSteps } from "@/features/questionnaires/data/steps-repository";
import { QUESTIONNAIRE_STATUS_LABELS } from "@/features/questionnaires/domain/schemas";
import { QuestionnaireActions } from "@/features/questionnaires/presentation/QuestionnaireActions";
import { QuestionnaireForm } from "@/features/questionnaires/presentation/QuestionnaireForm";
import { StepList } from "@/features/questionnaires/presentation/StepList";
import {
  deleteQuestionnaireAction,
  duplicateQuestionnaireAction,
  publishQuestionnaireAction,
  saveQuestionnaireAction,
  unpublishQuestionnaireAction,
} from "@/features/questionnaires/server/actions";
import { deleteStepAction } from "@/features/questionnaires/server/step-actions";
import { formSuccess } from "@/lib/forms/form-state";

export default async function EditQuestionnairePage({ params, searchParams }: PageProps<"/questionarios/[id]">) {
  const { id } = await params;
  const [questionnaire, categories, steps, query] = await Promise.all([
    findQuestionnaire(id),
    listCategories("questionnaire"),
    listSteps(id),
    searchParams,
  ]);
  if (!questionnaire) notFound();

  const flash = query.criado === "1" ? "Questionário criado como rascunho." : query.copiado === "1" ? "Cópia criada como rascunho." : null;

  return (
    <>
      <PageHeader title={questionnaire.title.pt || "Questionário"} description={`ID ${questionnaire.id}`} />
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        Status:
        <StatusBadge
          label={QUESTIONNAIRE_STATUS_LABELS[questionnaire.status]}
          tone={questionnaire.status === "published" ? "positive" : "neutral"}
        />
        <span>· Idiomas completos: {questionnaire.languages.join(", ").toUpperCase()}</span>
      </div>
      <QuestionnaireActions
        status={questionnaire.status}
        title={questionnaire.title.pt}
        publish={publishQuestionnaireAction.bind(null, questionnaire.id)}
        unpublish={unpublishQuestionnaireAction.bind(null, questionnaire.id)}
        duplicate={duplicateQuestionnaireAction.bind(null, questionnaire.id)}
        remove={deleteQuestionnaireAction.bind(null, questionnaire.id)}
      />
      <QuestionnaireForm
        questionnaire={questionnaire}
        categories={categoryOptions(categories)}
        action={saveQuestionnaireAction.bind(null, questionnaire.id)}
        initialState={flash ? formSuccess(flash) : undefined}
      />

      <section aria-labelledby="steps-heading" className="flex max-w-3xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="steps-heading" className="text-lg font-semibold">
            Passos ({steps.length})
          </h2>
          <div className="flex items-center gap-3">
            {steps.length > 0 && (
              <Link href={`/questionarios/${questionnaire.id}/fluxo`} className="text-sm underline">
                Pré-visualizar fluxo
              </Link>
            )}
            <Link
              href={`/questionarios/${questionnaire.id}/passos/novo`}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Novo passo
            </Link>
          </div>
        </div>
        {query.passo === "criado" && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Passo criado.
          </p>
        )}
        <StepList
          questionnaireId={questionnaire.id}
          steps={steps}
          deleteAction={(stepId) => deleteStepAction.bind(null, questionnaire.id, stepId)}
        />
      </section>
    </>
  );
}
