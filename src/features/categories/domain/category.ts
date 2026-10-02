import { z } from "zod";

import { localizedTextSchema, type LocalizedText } from "@/lib/content/localized-text";

/**
 * Categories share one shape (docs/data-model.md): `questionnaireCategories`
 * organise the questionnaire grid, `tipCategories` group tips (Ética,
 * Conhecimento…). The kind picks the collection and the panel section.
 */
export const CATEGORY_KINDS = ["questionnaire", "tip"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_STATUSES = ["active", "inactive"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
};

export type Category = {
  id: string;
  name: LocalizedText;
  order: number;
  status: CategoryStatus;
  updatedAt: Date | null;
};

/** What the category form can change. The questionnaire category icon arrives with Storage uploads. */
export const categoryInputSchema = z.object({
  name: localizedTextSchema,
  order: z.number({ error: "Informe a ordem." }).int("Use um número inteiro.").min(0, "Use 0 ou mais."),
  status: z.enum(CATEGORY_STATUSES, { error: "Escolha o status." }),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.order - b.order || a.name.pt.localeCompare(b.name.pt, "pt"));
}

/** `{ value, label }` pairs for selects and filters, in display order. */
export function categoryOptions(categories: Category[]) {
  return sortCategories(categories).map((category) => ({
    value: category.id,
    label: category.status === "active" ? category.name.pt : `${category.name.pt} (inativa)`,
  }));
}
