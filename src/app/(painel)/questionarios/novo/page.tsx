import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { listCategories } from "@/features/questionnaire-categories/data/categories-repository";
import { sortCategories } from "@/features/questionnaire-categories/domain/category";
import { QuestionnaireForm } from "@/features/questionnaires/presentation/QuestionnaireForm";
import { saveQuestionnaireAction } from "@/features/questionnaires/server/actions";

export default async function NewQuestionnairePage() {
  const categories = sortCategories(await listCategories());
  if (categories.length === 0) redirect("/questionarios");

  return (
    <>
      <PageHeader title="Novo questionário" description="Ele começa como rascunho e não aparece nos apps até ser publicado." />
      <QuestionnaireForm
        questionnaire={null}
        categories={categories.map((category) => ({ value: category.id, label: category.name.pt }))}
        action={saveQuestionnaireAction.bind(null, null)}
      />
    </>
  );
}
