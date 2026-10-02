import Link from "next/link";

export type ListFilterSelect = {
  /** URL parameter, e.g. "categoria" or "tipo". */
  param: string;
  label: string;
  /** First option, meaning no filter ("Todas", "Todos"). */
  allLabel: string;
  value: string | null;
  options: ReadonlyArray<{ value: string; label: string }>;
};

type ListFiltersProps = {
  /** List page the filters belong to ("Limpar" goes back to it). */
  basePath: string;
  query: string;
  searchPlaceholder: string;
  select: ListFilterSelect;
};

/**
 * Search + one select filter for admin lists. Plain GET form: the filters
 * live in the URL (?q=&<param>=), so results can be shared and reloaded.
 */
export function ListFilters({ basePath, query, searchPlaceholder, select }: ListFiltersProps) {
  const active = query.trim() !== "" || select.value !== null;

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
        {select.label}
        <select name={select.param} defaultValue={select.value ?? ""} className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal">
          <option value="">{select.allLabel}</option>
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
