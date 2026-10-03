import { completeLanguages, type Language, type LocalizedText } from "@/lib/content/localized-text";

import type { Questionnaire } from "./questionnaire";
import type { Step } from "./schemas";

/** A saved step: the document ID is the step ID used by jumps. */
export type StepRecord = Step & { id: string };

/** Flow order: `order`, then ID so equal orders stay stable. */
export function sortSteps<T extends { id: string; order: number }>(steps: T[]): T[] {
  return [...steps].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Order for a new step: after the last one. */
export function nextStepOrder(steps: ReadonlyArray<{ order: number }>): number {
  return steps.length === 0 ? 1 : Math.max(...steps.map((step) => step.order)) + 1;
}

/** Every translated text shown in the apps for one step. */
export function stepTexts(step: Step): Array<LocalizedText | null> {
  return [step.text, step.helpText, step.placeholder, step.infoFlag?.label ?? null, ...step.options.map((option) => option.text)];
}

/** Every tip a step links to (info flag and options), each once. */
export function stepTipIds(step: Pick<Step, "infoFlag" | "options">): string[] {
  const ids = [step.infoFlag?.tipId, ...step.options.map((option) => option.tipId)];
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

/**
 * `questionnaires.languages`: languages in which the questionnaire AND all of
 * its steps (text, help text, placeholder, info flag) and options are fully
 * translated (docs/data-model.md).
 */
export function questionnaireLanguages(
  questionnaire: Pick<Questionnaire, "title" | "description">,
  steps: ReadonlyArray<Step>,
): Language[] {
  return completeLanguages([questionnaire.title, questionnaire.description, ...steps.flatMap(stepTexts)]);
}

export type StepJumpPatch = {
  stepId: string;
  nextStepId: string | null;
  options: Step["options"];
};

/**
 * After deleting a step, jumps that pointed to it would be dangling. They are
 * reset to `null` ("follow the order"); returns only the steps that changed.
 */
export function clearJumpsTo(deletedStepId: string, steps: ReadonlyArray<StepRecord>): StepJumpPatch[] {
  return steps
    .filter((step) => step.id !== deletedStepId)
    .filter(
      (step) =>
        step.nextStepId === deletedStepId || step.options.some((option) => option.nextStepId === deletedStepId),
    )
    .map((step) => ({
      stepId: step.id,
      nextStepId: step.nextStepId === deletedStepId ? null : step.nextStepId,
      options: step.options.map((option) =>
        option.nextStepId === deletedStepId ? { ...option, nextStepId: null } : option,
      ),
    }));
}
