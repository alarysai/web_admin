import { displayText, type Language } from "@/lib/content/localized-text";

import type { StepRecord } from "./steps";

export type VisitedStep = { stepId: string; optionId: string | null };

export type PromptPart = { stepId: string; answer: string | null; instructions: string[] };

/**
 * What a run contributes to the prompt, for the panel preview: for each
 * visited step marked "vira parte do prompt?", the chosen answer and the step
 * and option prompt instructions. How these parts become the final prompt
 * text is decided by the generation service, not here.
 */
export function promptParts(path: VisitedStep[], steps: StepRecord[], language: Language): PromptPart[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  return path.flatMap(({ stepId, optionId }) => {
    const step = byId.get(stepId);
    if (!step?.partOfPrompt) return [];
    const option = step.options.find((candidate) => candidate.id === optionId) ?? null;
    const instructions = [step.promptInstruction, option?.promptInstruction].filter((value): value is string => Boolean(value));
    return [{ stepId, answer: option ? displayText(option.text, language) : null, instructions }];
  });
}
