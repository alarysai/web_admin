import { displayText, type Language } from "@/lib/content/localized-text";

import type { StepRecord } from "./steps";

/**
 * One answered (or skipped) step of a run. `optionIds` holds the chosen
 * options (one for single choice / yes-no, any number for multiple choice);
 * `text` is the open answer as typed.
 */
export type VisitedStep = {
  stepId: string;
  optionIds: string[];
  text: string | null;
  skipped: boolean;
};

export type PromptPart = { stepId: string; answer: string | null; instructions: string[] };

/**
 * What a run contributes to the prompt (proposta-questionario-v2, section 4):
 * for each visited step marked "vira parte do prompt?", in the order answered,
 *
 * | answer type              | answer                                    | instructions                         |
 * | single choice / yes-no   | chosen option text                        | step + option                        |
 * | multiple choice          | chosen texts in step order, ", "-joined   | step + each chosen option            |
 * | open text                | typed text, as is                         | step                                 |
 * | skipped / video          | null                                      | step                                 |
 *
 * How these parts become the final prompt text is up to the generation service.
 */
export function promptParts(path: VisitedStep[], steps: StepRecord[], language: Language): PromptPart[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  return path.flatMap((visit) => {
    const step = byId.get(visit.stepId);
    if (!step?.partOfPrompt) return [];

    const stepInstruction = step.promptInstruction ? [step.promptInstruction] : [];
    if (visit.skipped || step.type === "video") return [{ stepId: step.id, answer: null, instructions: stepInstruction }];

    if (step.answerType === "open_text") {
      return [{ stepId: step.id, answer: visit.text?.trim() ? visit.text : null, instructions: stepInstruction }];
    }

    // Chosen options in the order of the step, whatever order they were tapped in.
    const chosen = step.options.filter((option) => visit.optionIds.includes(option.id));
    const answer = chosen.length > 0 ? chosen.map((option) => displayText(option.text, language)).join(", ") : null;
    const optionInstructions = chosen.map((option) => option.promptInstruction).filter((value): value is string => Boolean(value));
    return [{ stepId: step.id, answer, instructions: [...stepInstruction, ...optionInstructions] }];
  });
}
