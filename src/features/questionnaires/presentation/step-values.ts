import { localizedValues } from "@/lib/forms/initial-values";

import { DEFAULT_ANSWER_FIELDS, type StepType } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";

/** Short random id for a new option (hex only: safe inside field names). */
export function newOptionId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

/** Saved step → the flat values the step form reads (see server/step-form.ts for the names). */
export function stepSavedValues(step: StepRecord | null, defaultOrder: number): Record<string, string> {
  const values: Record<string, string> = {
    order: String(step?.order ?? defaultOrder),
    type: step?.type ?? "question",
    videoUrl: step?.videoUrl ?? "",
    nextStepId: step?.nextStepId ?? "",
    partOfPrompt: step?.partOfPrompt ? "on" : "",
    promptInstruction: step?.promptInstruction ?? "",
    "infoFlag.enabled": step?.infoFlag ? "on" : "",
    "infoFlag.value": step?.infoFlag?.value ? "true" : "false",
    "infoFlag.tipId": step?.infoFlag?.tipId ?? "",
    answerType: step?.answerType ?? DEFAULT_ANSWER_FIELDS.answerType,
    // The form asks "Opcional (mostra Pular)", the opposite of `required`.
    optional: step && !step.required ? "on" : "",
    maxLength: String(step?.maxLength ?? DEFAULT_ANSWER_FIELDS.maxLength),
    ...localizedValues("text", step?.text ?? null),
    ...localizedValues("helpText", step?.helpText ?? null),
    ...localizedValues("placeholder", step?.placeholder ?? null),
    ...localizedValues("infoFlag.label", step?.infoFlag?.label ?? null),
  };

  for (const option of step?.options ?? []) {
    Object.assign(values, {
      [`options.${option.id}.id`]: option.id,
      [`options.${option.id}.promptInstruction`]: option.promptInstruction ?? "",
      [`options.${option.id}.nextStepId`]: option.nextStepId ?? "",
      [`options.${option.id}.tipId`]: option.tipId ?? "",
      ...localizedValues(`options.${option.id}.text`, option.text),
    });
  }
  return values;
}

/** Keeps a linked tip that no longer exists visible, so it is not dropped silently on save. */
export function tipSelectOptions(choices: ReadonlyArray<{ value: string; label: string }>, current: string) {
  if (!current || choices.some((choice) => choice.value === current)) return choices;
  return [...choices, { value: current, label: `Dica inexistente (${current})` }];
}

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  question: "Pergunta",
  video: "Vídeo",
};
