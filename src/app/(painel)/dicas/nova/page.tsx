import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { listCategories } from "@/features/categories/data/categories-repository";
import { categoryOptions } from "@/features/categories/domain/category";
import { listTips } from "@/features/tips/data/tips-repository";
import { TipForm } from "@/features/tips/presentation/TipForm";
import { saveTipAction } from "@/features/tips/server/actions";

export default async function NewTipPage() {
  const [categories, tips] = await Promise.all([listCategories("tip"), listTips()]);
  if (categories.length === 0) redirect("/dicas");
  const nextOrder = tips.length === 0 ? 1 : Math.max(...tips.map((tip) => tip.order)) + 1;

  return (
    <>
      <PageHeader title="Nova dica" description="Ela começa inativa e só aparece nos apps depois de ativada." />
      <TipForm tip={null} categories={categoryOptions(categories)} defaultOrder={nextOrder} action={saveTipAction.bind(null, null)} />
    </>
  );
}
