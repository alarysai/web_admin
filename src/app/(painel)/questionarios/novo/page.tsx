import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { listCategories } from "@/features/categories/data/categories-repository";
import { categoryOptions } from "@/features/categories/domain/category";
import { QuestionnaireForm } from "@/features/questionnaires/presentation/QuestionnaireForm";
import { saveQuestionnaireAction } from "@/features/questionnaires/server/actions";

export default async function NewQuestionnairePage() {
  const categories = await listCategories("questionnaire");
  if (categories.length === 0) redirect("/questionarios");

  return (
    <>
      <PageHeader title="Novo questionário" description="Ele começa como rascunho e não aparece nos apps até ser publicado." />
      <QuestionnaireForm
        questionnaire={null}
        categories={categoryOptions(categories)}
        action={saveQuestionnaireAction.bind(null, null)}
      />
    </>
  );
}
