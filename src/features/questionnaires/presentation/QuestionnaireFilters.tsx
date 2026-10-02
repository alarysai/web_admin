import Link from "next/link";

import type { QuestionnaireFilters as Filters } from "../domain/questionnaire";

type QuestionnaireFiltersProps = {
  filters: Filters;
  categories: ReadonlyArray<{ value: string; label: string }>;
};

/** Plain GET form: the filters live in the URL (?q=&categoria=), so results can be shared and reloaded. */
export function QuestionnaireFilters({ filters, categories }: QuestionnaireFiltersProps) {
  const active = filters.query.trim() !== "" || filters.categoryId !== null;

  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Buscar
        <input
          type="search"
          name="q"
          defaultValue={filters.query}
          placeholder="Título em qualquer idioma"
          className="w-64 rounded-md border border-zinc-300 px-3 py-2 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Categoria
        <select
          name="categoria"
          defaultValue={filters.categoryId ?? ""}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal"
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 text-sm">
        Filtrar
      </button>
      {active && (
        <Link href="/questionarios" className="py-2 text-sm text-zinc-600 underline">
          Limpar
        </Link>
      )}
    </form>
  );
}
