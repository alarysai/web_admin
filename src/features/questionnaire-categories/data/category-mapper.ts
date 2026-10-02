import { asDate, asEnum, asLocalizedText, asNumber } from "@/lib/content/firestore-mapping";

import { CATEGORY_STATUSES, type QuestionnaireCategory } from "../domain/category";

/** Firestore document → category. Unknown status is treated as inactive (hidden from the apps). */
export function toCategory(id: string, data: Record<string, unknown> | undefined): QuestionnaireCategory {
  const raw = data ?? {};
  return {
    id,
    name: asLocalizedText(raw.name),
    order: asNumber(raw.order),
    status: asEnum(raw.status, CATEGORY_STATUSES, "inactive"),
    updatedAt: asDate(raw.updatedAt),
  };
}
