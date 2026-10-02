import Link from "next/link";

import { ListFilters } from "@/components/layout/ListFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import { listCategories } from "@/features/categories/data/categories-repository";
import { categoryOptions } from "@/features/categories/domain/category";
import { listTips } from "@/features/tips/data/tips-repository";
import { filterTips, readTipFilters } from "@/features/tips/domain/tip";
import { TipTable } from "@/features/tips/presentation/TipTable";

export default async function TipsPage({ searchParams }: PageProps<"/dicas">) {
  const params = await searchParams;
  const filters = readTipFilters(params);
  const [tips, categories] = await Promise.all([listTips(), listCategories("tip")]);
  const categoryNames = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  return (
    <>
      <PageHeader
        title="Dicas"
        description={`${tips.length} cadastrada(s). Só as ativas aparecem nos apps.`}
        action={categories.length > 0 ? { href: "/dicas/nova", label: "Nova dica" } : undefined}
      />

      {params.excluida === "1" && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Dica excluída.
        </p>
      )}

      {categories.length === 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Cadastre uma categoria de dica antes de criar dicas.{" "}
          <Link href="/categorias-dicas/nova" className="underline">
            Nova categoria de dica
          </Link>
        </p>
      )}

      <ListFilters
        basePath="/dicas"
        query={filters.query}
        searchPlaceholder="Texto em qualquer idioma"
        select={{ param: "categoria", label: "Categoria", allLabel: "Todas", value: filters.categoryId, options: categoryOptions(categories) }}
      />
      <TipTable tips={filterTips(tips, filters)} categoryNames={categoryNames} filtered={filters.query.trim() !== "" || filters.categoryId !== null} />
    </>
  );
}
