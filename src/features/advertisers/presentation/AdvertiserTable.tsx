import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";

import { ADVERTISER_STATUS_LABELS, type Advertiser } from "../domain/advertiser";

type AdvertiserTableProps = {
  advertisers: Advertiser[];
  filtered: boolean;
};

export function AdvertiserTable({ advertisers, filtered }: AdvertiserTableProps) {
  if (advertisers.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600">
        {filtered ? (
          <>
            Nenhum anunciante encontrado com esses filtros.{" "}
            <Link href="/anunciantes" className="underline">
              Limpar filtros
            </Link>
          </>
        ) : (
          <>
            Nenhum anunciante cadastrado ainda.{" "}
            <Link href="/anunciantes/novo" className="underline">
              Criar o primeiro
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500">
          <th className="py-2 pr-4 font-medium">Nome</th>
          <th className="py-2 pr-4 font-medium">Tipo</th>
          <th className="py-2 pr-4 font-medium">Link</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 font-medium">Ordem</th>
        </tr>
      </thead>
      <tbody>
        {advertisers.map((advertiser) => (
          <tr key={advertiser.id} className="border-b border-zinc-100">
            <td className="py-2 pr-4">
              <Link href={`/anunciantes/${advertiser.id}`} className="font-medium underline-offset-2 hover:underline">
                {advertiser.name ?? "(sem nome)"}
              </Link>
            </td>
            <td className="py-2 pr-4">{advertiser.type || "—"}</td>
            <td className="max-w-xs truncate py-2 pr-4">
              {advertiser.link ? (
                <a href={advertiser.link} target="_blank" rel="noreferrer" className="text-zinc-600 underline">
                  {advertiser.link}
                </a>
              ) : (
                "—"
              )}
            </td>
            <td className="py-2 pr-4">
              <StatusBadge
                label={ADVERTISER_STATUS_LABELS[advertiser.status]}
                tone={advertiser.status === "active" ? "positive" : "neutral"}
              />
            </td>
            <td className="py-2">{advertiser.order}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
