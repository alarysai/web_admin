import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listCategories } from "@/features/questionnaire-categories/data/categories-repository";
import { sortCategories } from "@/features/questionnaire-categories/domain/category";
import { findQuestionnaire } from "@/features/questionnaires/data/questionnaires-repository";
import { QUESTIONNAIRE_STATUS_LABELS } from "@/features/questionnaires/domain/schemas";
import { QuestionnaireForm } from "@/features/questionnaires/presentation/QuestionnaireForm";
import { saveQuestionnaireAction } from "@/features/questionnaires/server/actions";
import { formSuccess } from "@/lib/forms/form-state";

export default async function EditQuestionnairePage({ params, searchParams }: PageProps<"/questionarios/[id]">) {
  const { id } = await params;
  const [questionnaire, categories, query] = await Promise.all([findQuestionnaire(id), listCategories(), searchParams]);
  if (!questionnaire) notFound();

  const justCreated = query.criado === "1";

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
      <QuestionnaireForm
        questionnaire={questionnaire}
        categories={sortCategories(categories).map((category) => ({ value: category.id, label: category.name.pt }))}
        action={saveQuestionnaireAction.bind(null, questionnaire.id)}
        initialState={justCreated ? formSuccess("Questionário criado como rascunho.") : undefined}
      />
      <section className="max-w-2xl rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
        <h2 className="font-semibold text-zinc-800">Passos</h2>
        O editor de passos e opções chega na próxima entrega.
      </section>
    </>
  );
}
