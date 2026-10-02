import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";

import { CATEGORY_STATUS_LABELS, type QuestionnaireCategory } from "../domain/category";

export function CategoryTable({ categories }: { categories: QuestionnaireCategory[] }) {
  if (categories.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600">
        Nenhuma categoria cadastrada ainda.{" "}
        <Link href="/categorias/nova" className="underline">
          Criar a primeira
        </Link>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500">
          <th className="py-2 pr-4 font-medium">Nome</th>
          <th className="py-2 pr-4 font-medium">Traduções</th>
          <th className="py-2 pr-4 font-medium">Status</th>
          <th className="py-2 font-medium">Ordem</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.id} className="border-b border-zinc-100">
            <td className="py-2 pr-4">
              <Link href={`/categorias/${category.id}`} className="font-medium underline-offset-2 hover:underline">
                {category.name.pt || "(sem nome)"}
              </Link>
            </td>
            <td className="py-2 pr-4 text-zinc-600">
              {[category.name.en, category.name.es].filter(Boolean).join(" · ") || "—"}
            </td>
            <td className="py-2 pr-4">
              <StatusBadge
                label={CATEGORY_STATUS_LABELS[category.status]}
                tone={category.status === "active" ? "positive" : "neutral"}
              />
            </td>
            <td className="py-2">{category.order}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
