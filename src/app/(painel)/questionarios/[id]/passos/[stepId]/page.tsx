import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { findQuestionnaire } from "@/features/questionnaires/data/questionnaires-repository";
import { findStep } from "@/features/questionnaires/data/steps-repository";
import { StepForm } from "@/features/questionnaires/presentation/StepForm";
import { newOptionId } from "@/features/questionnaires/presentation/step-values";
import { saveStepAction } from "@/features/questionnaires/server/step-actions";

export default async function EditStepPage({ params }: PageProps<"/questionarios/[id]/passos/[stepId]">) {
  const { id, stepId } = await params;
  const [questionnaire, step] = await Promise.all([findQuestionnaire(id), findStep(id, stepId)]);
  if (!questionnaire || !step) notFound();

  return (
    <>
      <PageHeader title={`Passo #${step.order}`} description={`${questionnaire.title.pt} · ID do passo ${step.id}`} />
      <StepForm
        questionnaireId={questionnaire.id}
        step={step}
        defaultOrder={step.order}
        initialOptionId={newOptionId()}
        action={saveStepAction.bind(null, questionnaire.id, step.id)}
      />
    </>
  );
}
