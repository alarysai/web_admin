import { PageHeader } from "@/components/layout/PageHeader";
import { listAdvertisers } from "@/features/advertisers/data/advertisers-repository";
import { advertiserTypes } from "@/features/advertisers/domain/advertiser";
import { AdvertiserForm } from "@/features/advertisers/presentation/AdvertiserForm";
import { saveAdvertiserAction } from "@/features/advertisers/server/actions";

export default async function NewAdvertiserPage() {
  const advertisers = await listAdvertisers();
  const nextOrder = advertisers.length === 0 ? 1 : Math.max(...advertisers.map((advertiser) => advertiser.order)) + 1;

  return (
    <>
      <PageHeader title="Novo anunciante" description="Ele começa inativo e só aparece nos apps depois de ativado." />
      <AdvertiserForm
        advertiser={null}
        knownTypes={advertiserTypes(advertisers)}
        defaultOrder={nextOrder}
        action={saveAdvertiserAction.bind(null, null)}
      />
    </>
  );
}
