import { z } from "zod";

/** Languages supported by the content (docs/data-model.md → LocalizedText). */
export const LANGUAGES = ["pt", "en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  pt: "Português",
  en: "Inglês",
  es: "Espanhol",
};

/** Blank translations are stored as null so the apps fall back to Portuguese. */
const optionalTranslation = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value ? value : null));

export const localizedTextSchema = z.object({
  pt: z.string().trim().min(1, "Obrigatório em português."),
  en: optionalTranslation,
  es: optionalTranslation,
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;

/**
 * Languages in which every given text is translated. Portuguese is always
 * included (it is mandatory); `null` texts are optional fields and ignored.
 */
export function completeLanguages(texts: ReadonlyArray<LocalizedText | null>): Language[] {
  const present = texts.filter((text): text is LocalizedText => text !== null);
  if (present.length === 0) return ["pt"];
  return LANGUAGES.filter((language) => language === "pt" || present.every((text) => Boolean(text[language])));
}

/** Text in the requested language, falling back to Portuguese. */
export function displayText(text: LocalizedText | null, language: Language = "pt"): string {
  if (!text) return "";
  return text[language] ?? text.pt;
}

/** Lowercase without accents, for accent-insensitive search ("Ética" ~ "etica"). */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
