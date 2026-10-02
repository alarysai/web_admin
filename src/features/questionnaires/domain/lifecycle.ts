import type { LocalizedText } from "@/lib/content/localized-text";

import { describeCycle, validateFlow } from "./flow";
import { END_OF_QUESTIONNAIRE, stepSchema } from "./schemas";
import { sortSteps, type StepRecord } from "./steps";

export type CategoryState = { exists: boolean; active: boolean };

/** Status of the tips linked by info flags, by tip id. Missing ids = deleted tips. */
export type TipStates = ReadonlyMap<string, { active: boolean }>;

export type PublishCheck = { ok: true; warnings: string[] } | { ok: false; problems: string[] };

/**
 * Whether a questionnaire can be published (shown in the apps): it needs
 * steps, every step valid by the schema (catches legacy/malformed data), a
 * valid flow, an existing category and existing linked tips. An inactive
 * category or tip is a warning: publishing is allowed, but the app hides it.
 */
export function checkPublishable(steps: StepRecord[], category: CategoryState, tips: TipStates = new Map()): PublishCheck {
  const problems: string[] = [];
  const ordered = sortSteps(steps);

  if (ordered.length === 0) problems.push("Adicione ao menos um passo.");
  if (!category.exists) problems.push("A categoria do questionário não existe mais. Escolha outra.");

  for (const step of ordered) {
    const { id, ...fields } = step;
    if (!stepSchema.safeParse(fields).success) {
      problems.push(`O passo #${step.order} tem campos inválidos. Abra e salve o passo para ver o que falta. (ID ${id})`);
    }
  }

  for (const issue of validateFlow(ordered)) {
    if (issue.kind === "cycle") {
      problems.push(`O fluxo tem um ciclo (${describeCycle(issue.path, ordered)}).`);
    } else {
      const step = ordered.find((candidate) => candidate.id === issue.stepId);
      problems.push(`O passo #${step?.order ?? "?"} salta para um passo que não existe.`);
    }
  }

  const inactiveTipSteps: number[] = [];
  for (const step of ordered) {
    const tipId = step.infoFlag?.tipId;
    if (!tipId) continue;
    const tip = tips.get(tipId);
    if (!tip) problems.push(`O passo #${step.order} está ligado a uma dica que não existe mais.`);
    else if (!tip.active) inactiveTipSteps.push(step.order);
  }

  if (problems.length > 0) return { ok: false, problems };

  const warnings: string[] = [];
  if (!category.active) warnings.push("A categoria está inativa: o questionário só aparece no app quando ela for ativada.");
  if (inactiveTipSteps.length > 0) {
    warnings.push(`Dica inativa nos passos ${inactiveTipSteps.map((order) => `#${order}`).join(", ")}: o app não a mostra até ela ser ativada.`);
  }
  return { ok: true, warnings };
}

const COPY_SUFFIX: Record<keyof LocalizedText, string> = { pt: " (cópia)", en: " (copy)", es: " (copia)" };

export function copyTitle(title: LocalizedText): LocalizedText {
  return {
    pt: `${title.pt}${COPY_SUFFIX.pt}`,
    en: title.en ? `${title.en}${COPY_SUFFIX.en}` : null,
    es: title.es ? `${title.es}${COPY_SUFFIX.es}` : null,
  };
}

/**
 * Steps for a duplicated questionnaire: new step ids, and every jump remapped
 * to the copy's steps. A jump to a step that no longer existed is dropped
 * (null = follow the order) instead of pointing back to the original.
 */
export function duplicateSteps(steps: StepRecord[], newId: () => string): StepRecord[] {
  const ids = new Map(steps.map((step) => [step.id, newId()]));
  const remap = (target: string | null) => {
    if (target === null || target === END_OF_QUESTIONNAIRE) return target;
    return ids.get(target) ?? null;
  };

  return steps.map((step) => ({
    ...step,
    id: ids.get(step.id)!,
    nextStepId: remap(step.nextStepId),
    options: step.options.map((option) => ({ ...option, nextStepId: remap(option.nextStepId) })),
  }));
}
