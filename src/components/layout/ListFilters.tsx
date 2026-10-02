import Link from "next/link";

type ListFiltersProps = {
  /** List page the filters belong to ("Limpar" goes back to it). */
  basePath: string;
  query: string;
  categoryId: string | null;
  categories: ReadonlyArray<{ value: string; label: string }>;
  searchPlaceholder: string;
};

/**
 * Search + category filter for admin lists. Plain GET form: the filters live
 * in the URL (?q=&categoria=), so results can be shared and reloaded.
 */
export function ListFilters({ basePath, query, categoryId, categories, searchPlaceholder }: ListFiltersProps) {
  const active = query.trim() !== "" || categoryId !== null;

  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Buscar
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={searchPlaceholder}
          className="w-64 rounded-md border border-zinc-300 px-3 py-2 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Categoria
        <select name="categoria" defaultValue={categoryId ?? ""} className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal">
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
        <Link href={basePath} className="py-2 text-sm text-zinc-600 underline">
          Limpar
        </Link>
      )}
    </form>
  );
}
