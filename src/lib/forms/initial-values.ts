import { LANGUAGES, type LocalizedText } from "@/lib/content/localized-text";

/** Saved LocalizedText → form values (`<name>.pt`, `<name>.en`, `<name>.es`). */
export function localizedValues(name: string, text: LocalizedText | null): Record<string, string> {
  return Object.fromEntries(LANGUAGES.map((language) => [`${name}.${language}`, text?.[language] ?? ""]));
}

/** What the form shows: the last submitted values win over the saved ones. */
export function resolveValues(saved: Record<string, string>, submitted: Record<string, string> | null) {
  return { ...saved, ...(submitted ?? {}) };
}
