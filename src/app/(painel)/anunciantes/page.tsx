import { ListFilters } from "@/components/layout/ListFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import { listAdvertisers } from "@/features/advertisers/data/advertisers-repository";
import { advertiserTypes, filterAdvertisers, readAdvertiserFilters } from "@/features/advertisers/domain/advertiser";
import { AdvertiserTable } from "@/features/advertisers/presentation/AdvertiserTable";

export default async function AdvertisersPage({ searchParams }: PageProps<"/anunciantes">) {
  const params = await searchParams;
  const filters = readAdvertiserFilters(params);
  const advertisers = await listAdvertisers();
  const types = advertiserTypes(advertisers);

  return (
    <>
      <PageHeader
        title="Anunciantes"
        description={`${advertisers.length} cadastrado(s). Só os ativos aparecem nos apps.`}
        action={{ href: "/anunciantes/novo", label: "Novo anunciante" }}
      />

      {params.excluido === "1" && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Anunciante excluído.
        </p>
      )}

      <ListFilters
        basePath="/anunciantes"
        query={filters.query}
        searchPlaceholder="Nome ou link"
        select={{ param: "tipo", label: "Tipo", allLabel: "Todos", value: filters.type, options: types.map((type) => ({ value: type, label: type })) }}
      />
      <AdvertiserTable advertisers={filterAdvertisers(advertisers, filters)} filtered={filters.query.trim() !== "" || filters.type !== null} />
    </>
  );
}
