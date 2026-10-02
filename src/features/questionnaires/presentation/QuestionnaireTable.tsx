import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { LocalizedText } from "@/lib/content/localized-text";

import type { Questionnaire } from "../domain/questionnaire";
import { QUESTIONNAIRE_STATUS_LABELS } from "../domain/schemas";

type QuestionnaireTableProps = {
  questionnaires: Questionnaire[];
  categoryNames: Record<string, LocalizedText>;
  /** true when a search/filter is applied (changes the empty message). */
  filtered: boolean;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function QuestionnaireTable({ questionnaires, categoryNames, filtered }: QuestionnaireTableProps) {
  if (questionnaires.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600">
        {filtered ? (
          <>
            Nenhum questionário encontrado com esses filtros.{" "}
            <Link href="/questionarios" className="underline">
              Limpar filtros
            </Link>
          </>
        ) : (
          <>
            Nenhum questionário cadastrado ainda.{" "}
            <Link href="/questionarios/novo" className="underline">
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
          <th className="py-2 pr-4 font-medium">Título</th>
          <th className="py-2 pr-4 font-medium">Categoria</th>
          <th className="py-2 pr-4 font-medium">Idiomas</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 pr-4 font-medium">Ordem</th>
          <th className="py-2 font-medium">Atualizado</th>
        </tr>
      </thead>
      <tbody>
        {questionnaires.map((questionnaire) => (
          <tr key={questionnaire.id} className="border-b border-zinc-100">
            <td className="py-2 pr-4">
              <Link href={`/questionarios/${questionnaire.id}`} className="font-medium underline-offset-2 hover:underline">
                {questionnaire.title.pt || "(sem título)"}
              </Link>
            </td>
            <td className="py-2 pr-4">{categoryNames[questionnaire.categoryId]?.pt ?? "Categoria removida"}</td>
            <td className="py-2 pr-4 uppercase">{questionnaire.languages.join(" · ")}</td>
            <td className="py-2 pr-4">
              <StatusBadge
                label={QUESTIONNAIRE_STATUS_LABELS[questionnaire.status]}
                tone={questionnaire.status === "published" ? "positive" : "neutral"}
              />
            </td>
            <td className="py-2 pr-4">{questionnaire.order}</td>
            <td className="py-2 text-zinc-500">{questionnaire.updatedAt ? dateFormat.format(questionnaire.updatedAt) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
