import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { listCategories } from "@/features/questionnaire-categories/data/categories-repository";
import { sortCategories } from "@/features/questionnaire-categories/domain/category";
import { listQuestionnaires } from "@/features/questionnaires/data/questionnaires-repository";
import { filterQuestionnaires, readQuestionnaireFilters } from "@/features/questionnaires/domain/questionnaire";
import { QuestionnaireFilters } from "@/features/questionnaires/presentation/QuestionnaireFilters";
import { QuestionnaireTable } from "@/features/questionnaires/presentation/QuestionnaireTable";

export default async function QuestionnairesPage({ searchParams }: PageProps<"/questionarios">) {
  const params = await searchParams;
  const filters = readQuestionnaireFilters(params);
  const [questionnaires, categories] = await Promise.all([listQuestionnaires(), listCategories()]);

  const categoryOptions = sortCategories(categories).map((category) => ({ value: category.id, label: category.name.pt }));
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

      <QuestionnaireFilters filters={filters} categories={categoryOptions} />
      <QuestionnaireTable questionnaires={visible} categoryNames={categoryNames} filtered={filtered} />
    </>
  );
}
