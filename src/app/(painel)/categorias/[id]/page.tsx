import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { findCategory } from "@/features/questionnaire-categories/data/categories-repository";
import { CategoryForm } from "@/features/questionnaire-categories/presentation/CategoryForm";
import { saveCategoryAction } from "@/features/questionnaire-categories/server/actions";

export default async function EditCategoryPage({ params }: PageProps<"/categorias/[id]">) {
  const { id } = await params;
  const category = await findCategory(id);
  if (!category) notFound();

  return (
    <>
      <PageHeader title={category.name.pt || "Categoria"} description={`ID ${category.id}`} />
      <CategoryForm category={category} action={saveCategoryAction.bind(null, category.id)} />
    </>
  );
}
