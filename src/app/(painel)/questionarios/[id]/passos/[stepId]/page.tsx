import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { findQuestionnaire } from "@/features/questionnaires/data/questionnaires-repository";
import { listSteps } from "@/features/questionnaires/data/steps-repository";
import { jumpTargets } from "@/features/questionnaires/presentation/jump-choices";
import { StepForm } from "@/features/questionnaires/presentation/StepForm";
import { newOptionId } from "@/features/questionnaires/presentation/step-values";
import { saveStepAction } from "@/features/questionnaires/server/step-actions";
import { listTips } from "@/features/tips/data/tips-repository";
import { tipLabel } from "@/features/tips/domain/tip";

export default async function EditStepPage({ params }: PageProps<"/questionarios/[id]/passos/[stepId]">) {
  const { id, stepId } = await params;
  const [questionnaire, steps, tips] = await Promise.all([findQuestionnaire(id), listSteps(id), listTips()]);
  const step = steps.find((candidate) => candidate.id === stepId);
  if (!questionnaire || !step) notFound();

  return (
    <>
      <PageHeader title={`Passo #${step.order}`} description={`${questionnaire.title.pt} · ID do passo ${step.id}`} />
      <StepForm
        questionnaireId={questionnaire.id}
        step={step}
        defaultOrder={step.order}
        initialOptionId={newOptionId()}
        jumpTargets={jumpTargets(steps, step.id)}
        tipChoices={tips.map((tip) => ({ value: tip.id, label: tipLabel(tip) }))}
        action={saveStepAction.bind(null, questionnaire.id, step.id)}
      />
    </>
  );
}
