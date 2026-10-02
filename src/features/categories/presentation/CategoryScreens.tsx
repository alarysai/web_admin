import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";

import { findCategory, listCategories } from "../data/categories-repository";
import { sortCategories, type CategoryKind } from "../domain/category";
import { saveCategoryAction } from "../server/actions";
import { CATEGORY_SECTIONS } from "./category-sections";
import { CategoryForm } from "./CategoryForm";
import { CategoryTable } from "./CategoryTable";

/** Screens shared by every kind of category; the route files only pick the kind. */

export async function CategoryListScreen({ kind, justCreated }: { kind: CategoryKind; justCreated: boolean }) {
  const section = CATEGORY_SECTIONS[kind];
  const categories = await listCategories(kind);

  return (
    <>
      <PageHeader title={section.title} description={section.description} action={{ href: `${section.basePath}/nova`, label: section.newLabel }} />
      {justCreated && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Categoria criada.
        </p>
      )}
      <CategoryTable categories={sortCategories(categories)} basePath={section.basePath} />
    </>
  );
}

export function NewCategoryScreen({ kind }: { kind: CategoryKind }) {
  const section = CATEGORY_SECTIONS[kind];
  return (
    <>
      <PageHeader title={section.newLabel} />
      <CategoryForm category={null} basePath={section.basePath} action={saveCategoryAction.bind(null, kind, null)} />
    </>
  );
}

export async function EditCategoryScreen({ kind, id }: { kind: CategoryKind; id: string }) {
  const section = CATEGORY_SECTIONS[kind];
  const category = await findCategory(kind, id);
  if (!category) notFound();

  return (
    <>
      <PageHeader title={category.name.pt || "Categoria"} description={`${section.title} · ID ${category.id}`} />
      <CategoryForm category={category} basePath={section.basePath} action={saveCategoryAction.bind(null, kind, category.id)} />
    </>
  );
}
