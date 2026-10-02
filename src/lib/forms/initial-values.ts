import { LANGUAGES, type LocalizedText } from "@/lib/content/localized-text";

/** Saved LocalizedText → form values (`<name>.pt`, `<name>.en`, `<name>.es`). */
export function localizedValues(name: string, text: LocalizedText | null): Record<string, string> {
  return Object.fromEntries(LANGUAGES.map((language) => [`${name}.${language}`, text?.[language] ?? ""]));
}

/**
 * What the form shows: after a submit, exactly what was submitted; otherwise
 * the saved values. Not merged — an unchecked checkbox is absent from the
 * submission and must not come back checked from the saved values.
 */
export function resolveValues(saved: Record<string, string>, submitted: Record<string, string> | null) {
  return submitted ?? saved;
}
