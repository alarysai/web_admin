import Link from "next/link";

import { ListFilters } from "@/components/layout/ListFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import { listCategories } from "@/features/categories/data/categories-repository";
import { categoryOptions } from "@/features/categories/domain/category";
import { listQuestionnaires } from "@/features/questionnaires/data/questionnaires-repository";
import { filterQuestionnaires, readQuestionnaireFilters } from "@/features/questionnaires/domain/questionnaire";
import { QuestionnaireTable } from "@/features/questionnaires/presentation/QuestionnaireTable";

export default async function QuestionnairesPage({ searchParams }: PageProps<"/questionarios">) {
  const params = await searchParams;
  const filters = readQuestionnaireFilters(params);
  const [questionnaires, categories] = await Promise.all([listQuestionnaires(), listCategories("questionnaire")]);

  const categoryNames = Object.fromEntries(categories.map((category) => [category.id, category.name]));
  const visible = filterQuestionnaires(questionnaires, filters);
  const filtered = filters.query.trim() !== "" || filters.categoryId !== null;

  return (
    <>
      <PageHeader
        title="Questionários"
        description={`${questionnaires.length} cadastrado(s)`}
        action={categories.length > 0 ? { href: "/questionarios/novo", label: "Novo questionário" } : undefined}
      />

      {params.excluido === "1" && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Questionário excluído.
        </p>
      )}

      {categories.length === 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Cadastre uma categoria antes de criar questionários.{" "}
          <Link href="/categorias/nova" className="underline">
            Nova categoria
          </Link>
        </p>
      )}

      <ListFilters
        basePath="/questionarios"
        query={filters.query}
        searchPlaceholder="Título em qualquer idioma"
        select={{ param: "categoria", label: "Categoria", allLabel: "Todas", value: filters.categoryId, options: categoryOptions(categories) }}
      />
      <QuestionnaireTable questionnaires={visible} categoryNames={categoryNames} filtered={filtered} />
    </>
  );
}
