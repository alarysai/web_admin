import { PageHeader } from "@/components/layout/PageHeader";
import { listCategories } from "@/features/questionnaire-categories/data/categories-repository";
import { sortCategories } from "@/features/questionnaire-categories/domain/category";
import { CategoryTable } from "@/features/questionnaire-categories/presentation/CategoryTable";

export default async function CategoriesPage({ searchParams }: PageProps<"/categorias">) {
  const [categories, query] = await Promise.all([listCategories(), searchParams]);

  return (
    <>
      <PageHeader
        title="Categorias de questionário"
        description="Organizam a grade de questionários nos apps. Só as ativas aparecem."
        action={{ href: "/categorias/nova", label: "Nova categoria" }}
      />
      {query.criada === "1" && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Categoria criada.
        </p>
      )}
      <CategoryTable categories={sortCategories(categories)} />
    </>
  );
}
