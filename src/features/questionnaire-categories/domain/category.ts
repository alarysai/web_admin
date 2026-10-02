import { z } from "zod";

import { localizedTextSchema, type LocalizedText } from "@/lib/content/localized-text";

export const CATEGORY_STATUSES = ["active", "inactive"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
};

/** `questionnaireCategories/{categoryId}` as shown in the panel (docs/data-model.md). */
export type QuestionnaireCategory = {
  id: string;
  name: LocalizedText;
  order: number;
  status: CategoryStatus;
  updatedAt: Date | null;
};

/** What the category form can change. The icon arrives with Storage uploads. */
export const categoryInputSchema = z.object({
  name: localizedTextSchema,
  order: z.number({ error: "Informe a ordem." }).int("Use um número inteiro.").min(0, "Use 0 ou mais."),
  status: z.enum(CATEGORY_STATUSES, { error: "Escolha o status." }),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export function sortCategories(categories: QuestionnaireCategory[]): QuestionnaireCategory[] {
  return [...categories].sort((a, b) => a.order - b.order || a.name.pt.localeCompare(b.name.pt, "pt"));
}
