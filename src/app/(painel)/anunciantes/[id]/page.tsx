import { notFound } from "next/navigation";

import { ActivationActions } from "@/components/form/ActivationActions";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listAdvertisers } from "@/features/advertisers/data/advertisers-repository";
import { ADVERTISER_STATUS_LABELS, advertiserTypes } from "@/features/advertisers/domain/advertiser";
import { AdvertiserForm } from "@/features/advertisers/presentation/AdvertiserForm";
import {
  activateAdvertiserAction,
  deactivateAdvertiserAction,
  deleteAdvertiserAction,
  saveAdvertiserAction,
} from "@/features/advertisers/server/actions";
import { formSuccess } from "@/lib/forms/form-state";

export default async function EditAdvertiserPage({ params, searchParams }: PageProps<"/anunciantes/[id]">) {
  const { id } = await params;
  const [advertisers, query] = await Promise.all([listAdvertisers(), searchParams]);
  const advertiser = advertisers.find((candidate) => candidate.id === id);
  if (!advertiser) notFound();

  return (
    <>
      <PageHeader title={advertiser.name ?? "Anunciante"} description={`ID ${advertiser.id}`} />
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        Status:
        <StatusBadge
          label={ADVERTISER_STATUS_LABELS[advertiser.status]}
          tone={advertiser.status === "active" ? "positive" : "neutral"}
        />
      </div>
      <ActivationActions
        active={advertiser.status === "active"}
        subject="este anunciante"
        activate={activateAdvertiserAction.bind(null, advertiser.id)}
        deactivate={deactivateAdvertiserAction.bind(null, advertiser.id)}
        remove={deleteAdvertiserAction.bind(null, advertiser.id)}
      />
      <AdvertiserForm
        advertiser={advertiser}
        knownTypes={advertiserTypes(advertisers)}
        defaultOrder={advertiser.order}
        action={saveAdvertiserAction.bind(null, advertiser.id)}
        initialState={query.criado === "1" ? formSuccess("Anunciante criado como inativo.") : undefined}
      />
    </>
  );
}
