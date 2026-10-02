import { asDate, asEnum, asLocalizedText, asNumber, asString } from "@/lib/content/firestore-mapping";
import { LANGUAGES, type Language } from "@/lib/content/localized-text";

import { TIP_STATUSES, type Tip } from "../domain/tip";

/** Firestore document → tip. Unknown status is treated as inactive (hidden from the apps). */
export function toTip(id: string, data: Record<string, unknown> | undefined): Tip {
  const raw = data ?? {};
  const languages = Array.isArray(raw.languages)
    ? LANGUAGES.filter((language) => (raw.languages as unknown[]).includes(language))
    : [];

  return {
    id,
    categoryId: asString(raw.categoryId) ?? "",
    text: asLocalizedText(raw.text),
    languages: languages.length > 0 ? languages : (["pt"] as Language[]),
    order: asNumber(raw.order),
    status: asEnum(raw.status, TIP_STATUSES, "inactive"),
    updatedAt: asDate(raw.updatedAt),
  };
}
