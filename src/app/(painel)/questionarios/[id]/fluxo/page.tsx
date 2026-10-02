import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { findQuestionnaire } from "@/features/questionnaires/data/questionnaires-repository";
import { listSteps } from "@/features/questionnaires/data/steps-repository";
import { unreachableSteps, validateFlow } from "@/features/questionnaires/domain/flow";
import { FlowMap } from "@/features/questionnaires/presentation/FlowMap";
import { FlowSimulator } from "@/features/questionnaires/presentation/FlowSimulator";

export default async function FlowPreviewPage({ params }: PageProps<"/questionarios/[id]/fluxo">) {
  const { id } = await params;
  const [questionnaire, steps] = await Promise.all([findQuestionnaire(id), listSteps(id)]);
  if (!questionnaire) notFound();

  return (
    <>
      <PageHeader title="Pré-visualização do fluxo" description={questionnaire.title.pt} />
      <Link href={`/questionarios/${questionnaire.id}`} className="text-sm text-zinc-600 underline">
        Voltar para o questionário
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <FlowSimulator steps={steps} />
        <FlowMap steps={steps} issues={validateFlow(steps)} unreachable={unreachableSteps(steps)} />
      </div>
    </>
  );
}
