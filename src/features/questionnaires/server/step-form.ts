import { readInteger, readLocalizedText, readOptionalLocalizedText, readString } from "@/lib/forms/form-data";

/**
 * Field names of the step form. Option fields are named by the option's stable
 * id (`options.<id>.<field>`), not by position, so removing an option never
 * shifts the values of the others. Their order is the order in the form.
 *
 * Jumps (`nextStepId`) and the info flag tip travel as hidden fields, so saving
 * keeps what the jump editor (delivery 3) and tips (3.4) will set.
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

/**
 * FormData → object for stepSchema. Fields that do not belong to the chosen
 * type are dropped (a video has no options, a question has no video link), so
 * switching the type in the form never saves leftovers.
 */
export function readStepForm(formData: FormData) {
  const type = readString(formData, "type");

  const options = optionIds(formData).map((id) => ({
    id,
    text: readOptionalLocalizedText(formData, `options.${id}.text`),
    image: null,
    promptInstruction: readString(formData, `options.${id}.promptInstruction`),
    nextStepId: nullable(readString(formData, `options.${id}.nextStepId`)),
  }));

  return {
    order: readInteger(formData, "order"),
    type,
    text: readOptionalLocalizedText(formData, "text"),
    image: null,
    videoUrl: type === "video" ? nullable(readString(formData, "videoUrl")) : null,
    options: type === "question" ? options : [],
    nextStepId: nullable(readString(formData, "nextStepId")),
    partOfPrompt: readString(formData, "partOfPrompt") === "on",
    promptInstruction: readString(formData, "promptInstruction"),
    infoFlag: readInfoFlag(formData),
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
