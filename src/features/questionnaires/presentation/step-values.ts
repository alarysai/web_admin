import { localizedValues } from "@/lib/forms/initial-values";

import type { StepType } from "../domain/schemas";
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
    ...localizedValues("text", step?.text ?? null),
    ...localizedValues("infoFlag.label", step?.infoFlag?.label ?? null),
  };

  for (const option of step?.options ?? []) {
    Object.assign(values, {
      [`options.${option.id}.id`]: option.id,
      [`options.${option.id}.promptInstruction`]: option.promptInstruction ?? "",
      [`options.${option.id}.nextStepId`]: option.nextStepId ?? "",
      ...localizedValues(`options.${option.id}.text`, option.text),
    });
  }
  return values;
}

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  question: "Pergunta",
  video: "Vídeo",
};
