import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { findQuestionnaire } from "@/features/questionnaires/data/questionnaires-repository";
import { listSteps } from "@/features/questionnaires/data/steps-repository";
import { unreachableSteps, validateFlow } from "@/features/questionnaires/domain/flow";
import { FlowMap } from "@/features/questionnaires/presentation/FlowMap";
import { FlowSimulator } from "@/features/questionnaires/presentation/FlowSimulator";
import { listTips } from "@/features/tips/data/tips-repository";

export default async function FlowPreviewPage({ params }: PageProps<"/questionarios/[id]/fluxo">) {
  const { id } = await params;
  const [questionnaire, steps, tips] = await Promise.all([findQuestionnaire(id), listSteps(id), listTips()]);
  if (!questionnaire) notFound();
  // Only active tips, like the app: an inactive tip is simply not shown.
  const tipTexts = Object.fromEntries(tips.filter((tip) => tip.status === "active").map((tip) => [tip.id, tip.text]));

  return (
    <>
      <PageHeader title="Pré-visualização do fluxo" description={questionnaire.title.pt} />
      <Link href={`/questionarios/${questionnaire.id}`} className="text-sm text-zinc-600 underline">
        Voltar para o questionário
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <FlowSimulator steps={steps} tipTexts={tipTexts} />
        <FlowMap steps={steps} issues={validateFlow(steps)} unreachable={unreachableSteps(steps)} />
      </div>
    </>
  );
}
