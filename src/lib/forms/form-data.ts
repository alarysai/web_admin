import { LANGUAGES, type Language } from "@/lib/content/localized-text";

/** Text fields of a submitted form, without React's internal `$ACTION_*` entries. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

export function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Whole number typed in a form. Blank becomes NaN so the schema reports it as
 * required instead of silently storing 0.
 */
export function readInteger(formData: FormData, name: string): number {
  const raw = readString(formData, name).trim();
  return raw === "" ? Number.NaN : Number(raw);
}

/** `<name>.pt`, `<name>.en`, `<name>.es` inputs as a LocalizedText-shaped object. */
export function readLocalizedText(formData: FormData, name: string): Record<Language, string> {
  return Object.fromEntries(LANGUAGES.map((language) => [language, readString(formData, `${name}.${language}`)])) as Record<
    Language,
    string
  >;
}

/** Optional translated field: `null` when every language was left blank. */
export function readOptionalLocalizedText(formData: FormData, name: string): Record<Language, string> | null {
  const text = readLocalizedText(formData, name);
  return LANGUAGES.every((language) => text[language].trim() === "") ? null : text;
}
