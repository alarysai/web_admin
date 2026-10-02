import { normalizeForSearch, LANGUAGES, type Language, type LocalizedText } from "@/lib/content/localized-text";

import type { QuestionnaireStatus } from "./schemas";

/** `questionnaires/{questionnaireId}` as shown in the panel (docs/data-model.md). */
export type Questionnaire = {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  categoryId: string;
  languages: Language[];
  order: number;
  status: QuestionnaireStatus;
  updatedAt: Date | null;
};

export type QuestionnaireFilters = {
  query: string;
  categoryId: string | null;
};

/**
 * Admin list: accent/case-insensitive search on the title in every language,
 * optional category filter, ordered by `order` then Portuguese title.
 */
export function filterQuestionnaires(questionnaires: Questionnaire[], filters: QuestionnaireFilters): Questionnaire[] {
  const query = normalizeForSearch(filters.query);

  return questionnaires
    .filter((questionnaire) => !filters.categoryId || questionnaire.categoryId === filters.categoryId)
    .filter((questionnaire) => {
      if (!query) return true;
      return LANGUAGES.some((language) => {
        const title = questionnaire.title[language];
        return title ? normalizeForSearch(title).includes(query) : false;
      });
    })
    .sort((a, b) => a.order - b.order || a.title.pt.localeCompare(b.title.pt, "pt"));
}

/** Reads `?q=` and `?categoria=` from the list page URL. */
export function readQuestionnaireFilters(params: Record<string, string | string[] | undefined>): QuestionnaireFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const categoryId = first(params.categoria).trim();
  return { query: first(params.q), categoryId: categoryId || null };
}
