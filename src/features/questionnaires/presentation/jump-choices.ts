import { END_OF_QUESTIONNAIRE } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";

export type JumpTarget = { id: string; label: string };

/** Steps the edited step can jump to: every other step, labelled "#order · text". */
export function jumpTargets(steps: StepRecord[], currentStepId: string | null): JumpTarget[] {
  return steps
    .filter((step) => step.id !== currentStepId)
    .map((step) => {
      const text = step.text?.pt ?? "";
      const short = text.length > 50 ? `${text.slice(0, 49)}…` : text;
      return { id: step.id, label: `#${step.order} · ${short || "(sem texto)"}` };
    });
}

/**
 * Select options for a jump field. `emptyLabel` names the default (follow the
 * order / use the step's jump). A saved value that is no longer a target is
 * kept visible, so the admin sees it instead of it silently disappearing.
 */
export function jumpChoices(targets: JumpTarget[], emptyLabel: string, currentValue: string) {
  const choices = [
    { value: "", label: emptyLabel },
    ...targets.map((target) => ({ value: target.id, label: `Ir para ${target.label}` })),
    { value: END_OF_QUESTIONNAIRE, label: "Encerrar o questionário" },
  ];
  if (currentValue && !choices.some((choice) => choice.value === currentValue)) {
    choices.push({ value: currentValue, label: `Passo inexistente (${currentValue})` });
  }
  return choices;
}
