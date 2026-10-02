import { z } from "zod";

import { LANGUAGES, localizedTextSchema, normalizeForSearch, type Language, type LocalizedText } from "@/lib/content/localized-text";

export const TIP_STATUSES = ["active", "inactive"] as const;
export type TipStatus = (typeof TIP_STATUSES)[number];

export const TIP_STATUS_LABELS: Record<TipStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
};

/** `tips/{tipId}` as shown in the panel (docs/data-model.md). */
export type Tip = {
  id: string;
  categoryId: string;
  text: LocalizedText;
  languages: Language[];
  order: number;
  status: TipStatus;
  updatedAt: Date | null;
};

/** Fields edited in the tip form. Status changes through activate/deactivate; the image arrives with Storage. */
export const tipInputSchema = z.object({
  categoryId: z.string().trim().min(1, "Escolha uma categoria."),
  text: localizedTextSchema,
  order: z.number({ error: "Informe a ordem." }).int("Use um número inteiro.").min(0, "Use 0 ou mais."),
});

export type TipInput = z.infer<typeof tipInputSchema>;

/** A step whose info flag links to a tip (who would break if the tip changed). */
export type TipUsage = { questionnaireId: string; questionnaireTitle: string; published: boolean; stepId: string };

export type TipFilters = { query: string; categoryId: string | null };

/** Accent/case-insensitive search on the text in every language, optional category, ordered by `order` then text. */
export function filterTips(tips: Tip[], filters: TipFilters): Tip[] {
  const query = normalizeForSearch(filters.query);
  return tips
    .filter((tip) => !filters.categoryId || tip.categoryId === filters.categoryId)
    .filter((tip) => !query || LANGUAGES.some((language) => normalizeForSearch(tip.text[language] ?? "").includes(query)))
    .sort((a, b) => a.order - b.order || a.text.pt.localeCompare(b.text.pt, "pt"));
}

/** Reads `?q=` and `?categoria=` from the tips list URL. */
export function readTipFilters(params: Record<string, string | string[] | undefined>): TipFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const categoryId = first(params.categoria).trim();
  return { query: first(params.q), categoryId: categoryId || null };
}

/** Short label for selects ("Dica: …"), e.g. when linking a step's info flag. */
export function tipLabel(tip: Pick<Tip, "text" | "status">): string {
  const text = tip.text.pt.length > 60 ? `${tip.text.pt.slice(0, 59)}…` : tip.text.pt || "(sem texto)";
  return tip.status === "active" ? text : `${text} (inativa)`;
}
