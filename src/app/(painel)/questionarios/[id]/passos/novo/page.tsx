import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { findQuestionnaire } from "@/features/questionnaires/data/questionnaires-repository";
import { listSteps } from "@/features/questionnaires/data/steps-repository";
import { nextStepOrder } from "@/features/questionnaires/domain/steps";
import { StepForm } from "@/features/questionnaires/presentation/StepForm";
import { newOptionId } from "@/features/questionnaires/presentation/step-values";
import { saveStepAction } from "@/features/questionnaires/server/step-actions";

export default async function NewStepPage({ params }: PageProps<"/questionarios/[id]/passos/novo">) {
  const { id } = await params;
  const [questionnaire, steps] = await Promise.all([findQuestionnaire(id), listSteps(id)]);
  if (!questionnaire) notFound();

  return (
    <>
      <PageHeader title="Novo passo" description={questionnaire.title.pt} />
      <StepForm
        questionnaireId={questionnaire.id}
        step={null}
        defaultOrder={nextStepOrder(steps)}
        initialOptionId={newOptionId()}
        action={saveStepAction.bind(null, questionnaire.id, null)}
      />
    </>
  );
}
