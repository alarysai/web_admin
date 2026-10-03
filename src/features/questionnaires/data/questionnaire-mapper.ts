import { asDate, asEnum, asLocalizedText, asNumber, asOptionalLocalizedText, asString } from "@/lib/content/firestore-mapping";
import { LANGUAGES, type Language } from "@/lib/content/localized-text";

import type { Questionnaire } from "../domain/questionnaire";
import { QUESTIONNAIRE_STATUSES } from "../domain/schemas";

/** Whole number ≥ 0, or null (not shown) for anything else. */
function asCreditCost(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Firestore document → questionnaire. Unknown status falls back to draft, so a
 * malformed document never shows up as published in the panel.
 */
export function toQuestionnaire(id: string, data: Record<string, unknown> | undefined): Questionnaire {
  const raw = data ?? {};
  const languages = Array.isArray(raw.languages)
    ? LANGUAGES.filter((language) => (raw.languages as unknown[]).includes(language))
    : [];

  return {
    id,
    title: asLocalizedText(raw.title),
    description: asOptionalLocalizedText(raw.description),
    categoryId: asString(raw.categoryId) ?? "",
    languages: languages.length > 0 ? languages : (["pt"] as Language[]),
    order: asNumber(raw.order),
    creditCost: asCreditCost(raw.creditCost),
    status: asEnum(raw.status, QUESTIONNAIRE_STATUSES, "draft"),
    updatedAt: asDate(raw.updatedAt),
  };
}
