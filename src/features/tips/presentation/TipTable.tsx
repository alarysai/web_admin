import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { LocalizedText } from "@/lib/content/localized-text";

import { TIP_STATUS_LABELS, type Tip } from "../domain/tip";

type TipTableProps = {
  tips: Tip[];
  categoryNames: Record<string, LocalizedText>;
  filtered: boolean;
};

function excerpt(text: string): string {
  return text.length > 90 ? `${text.slice(0, 89)}…` : text || "(sem texto)";
}

export function TipTable({ tips, categoryNames, filtered }: TipTableProps) {
  if (tips.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600">
        {filtered ? (
          <>
            Nenhuma dica encontrada com esses filtros.{" "}
            <Link href="/dicas" className="underline">
              Limpar filtros
            </Link>
          </>
        ) : (
          <>
            Nenhuma dica cadastrada ainda.{" "}
            <Link href="/dicas/nova" className="underline">
              Criar a primeira
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
          <th className="py-2 pr-4 font-medium">Dica</th>
          <th className="py-2 pr-4 font-medium">Categoria</th>
          <th className="py-2 pr-4 font-medium">Idiomas</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 font-medium">Ordem</th>
        </tr>
      </thead>
      <tbody>
        {tips.map((tip) => (
          <tr key={tip.id} className="border-b border-zinc-100">
            <td className="py-2 pr-4">
              <Link href={`/dicas/${tip.id}`} className="underline-offset-2 hover:underline">
                {excerpt(tip.text.pt)}
              </Link>
            </td>
            <td className="py-2 pr-4">{categoryNames[tip.categoryId]?.pt ?? "Categoria removida"}</td>
            <td className="py-2 pr-4 uppercase">{tip.languages.join(" · ")}</td>
            <td className="py-2 pr-4">
              <StatusBadge label={TIP_STATUS_LABELS[tip.status]} tone={tip.status === "active" ? "positive" : "neutral"} />
            </td>
            <td className="py-2">{tip.order}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
