import { readInteger, readLocalizedText, readOptionalLocalizedText, readString } from "@/lib/forms/form-data";

import { ANSWER_TYPES, answerTypeHasOptions, DEFAULT_ANSWER_FIELDS, optionJumpsApply, type AnswerType } from "../domain/schemas";

/**
 * Field names of the step form. Option fields are named by the option's stable
 * id (`options.<id>.<field>`), not by position, so removing an option never
 * shifts the values of the others. Their order is the order in the form.
 */
const OPTION_ID_FIELD = /^options\.([^.]+)\.id$/;

/** Option ids in the order they appear in the form. */
export function optionIds(formData: FormData): string[] {
  return [...formData.keys()]
    .map((key) => OPTION_ID_FIELD.exec(key)?.[1])
    .filter((id): id is string => id !== undefined);
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readInfoFlag(formData: FormData) {
  if (readString(formData, "infoFlag.enabled") !== "on") return null;
  return {
    label: readLocalizedText(formData, "infoFlag.label"),
    value: readString(formData, "infoFlag.value") === "true",
    tipId: nullable(readString(formData, "infoFlag.tipId")),
  };
}

/** Unknown or missing answer type reads as the default; the schema only sees known values. */
function readAnswerType(formData: FormData): AnswerType {
  const value = readString(formData, "answerType");
  return (ANSWER_TYPES as readonly string[]).includes(value) ? (value as AnswerType) : DEFAULT_ANSWER_FIELDS.answerType;
}

/** Blank limit means "use the default"; anything else goes to the schema (1 to 5000). */
function readMaxLength(formData: FormData): number {
  return readString(formData, "maxLength").trim() === "" ? DEFAULT_ANSWER_FIELDS.maxLength : readInteger(formData, "maxLength");
}

/**
 * FormData → object for stepSchema. Fields that do not belong to the chosen
 * type are dropped or reset, so switching type in the form never saves
 * leftovers: a video has no options and no answer settings; an open answer has
 * no options; option jumps only exist where an option decides the next step.
 */
export function readStepForm(formData: FormData) {
  const type = readString(formData, "type");
  const isQuestion = type === "question";
  const answerType = isQuestion ? readAnswerType(formData) : DEFAULT_ANSWER_FIELDS.answerType;

  const options = optionIds(formData).map((id) => ({
    id,
    text: readOptionalLocalizedText(formData, `options.${id}.text`),
    image: null,
    promptInstruction: readString(formData, `options.${id}.promptInstruction`),
    nextStepId: optionJumpsApply(answerType) ? nullable(readString(formData, `options.${id}.nextStepId`)) : null,
    tipId: nullable(readString(formData, `options.${id}.tipId`)),
  }));

  return {
    order: readInteger(formData, "order"),
    type,
    text: readOptionalLocalizedText(formData, "text"),
    image: null,
    videoUrl: type === "video" ? nullable(readString(formData, "videoUrl")) : null,
    options: isQuestion && answerTypeHasOptions(answerType) ? options : [],
    nextStepId: nullable(readString(formData, "nextStepId")),
    partOfPrompt: readString(formData, "partOfPrompt") === "on",
    promptInstruction: readString(formData, "promptInstruction"),
    infoFlag: readInfoFlag(formData),
    answerType,
    helpText: isQuestion ? readOptionalLocalizedText(formData, "helpText") : null,
    // The checkbox is "Opcional (mostra Pular)": checked means not required.
    required: isQuestion ? readString(formData, "optional") !== "on" : true,
    maxLength: isQuestion && answerType === "open_text" ? readMaxLength(formData) : DEFAULT_ANSWER_FIELDS.maxLength,
    placeholder: isQuestion && answerType === "open_text" ? readOptionalLocalizedText(formData, "placeholder") : null,
  };
}

/**
 * Zod reports option errors by position (`options.2.text`); the form names
 * fields by option id (`options.<id>.text`). Rewrites the keys accordingly.
 */
export function errorsByOptionId(errors: Record<string, string>, ids: string[]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).map(([key, message]) => {
      const match = /^options\.(\d+)(\..*)?$/.exec(key);
      const id = match ? ids[Number(match[1])] : undefined;
      return [id ? `options.${id}${match?.[2] ?? ""}` : key, message];
    }),
  );
}
