import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listCategories } from "@/features/categories/data/categories-repository";
import { categoryOptions } from "@/features/categories/domain/category";
import { findTip, findTipUsages } from "@/features/tips/data/tips-repository";
import { TIP_STATUS_LABELS } from "@/features/tips/domain/tip";
import { TipActions } from "@/features/tips/presentation/TipActions";
import { TipForm } from "@/features/tips/presentation/TipForm";
import { activateTipAction, deactivateTipAction, deleteTipAction, saveTipAction } from "@/features/tips/server/actions";
import { describeUsages } from "@/features/tips/server/tip-lifecycle";
import { formSuccess } from "@/lib/forms/form-state";

export default async function EditTipPage({ params, searchParams }: PageProps<"/dicas/[id]">) {
  const { id } = await params;
  const [tip, categories, usages, query] = await Promise.all([findTip(id), listCategories("tip"), findTipUsages(id), searchParams]);
  if (!tip) notFound();

  return (
    <>
      <PageHeader title="Dica" description={`ID ${tip.id}`} />
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
        Status:
        <StatusBadge label={TIP_STATUS_LABELS[tip.status]} tone={tip.status === "active" ? "positive" : "neutral"} />
        <span>· Idiomas completos: {tip.languages.join(", ").toUpperCase()}</span>
        <span>· {usages.length > 0 ? `Usada em: ${describeUsages(usages)}` : "Não está ligada a nenhum passo."}</span>
      </div>
      <TipActions
        status={tip.status}
        activate={activateTipAction.bind(null, tip.id)}
        deactivate={deactivateTipAction.bind(null, tip.id)}
        remove={deleteTipAction.bind(null, tip.id)}
      />
      <TipForm
        tip={tip}
        categories={categoryOptions(categories)}
        defaultOrder={tip.order}
        action={saveTipAction.bind(null, tip.id)}
        initialState={query.criada === "1" ? formSuccess("Dica criada como inativa.") : undefined}
      />
    </>
  );
}
