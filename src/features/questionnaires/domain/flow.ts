import { END_OF_QUESTIONNAIRE, type Step, type StepOption } from "./schemas";
import { clearJumpsTo, sortSteps, type StepRecord } from "./steps";

/**
 * Questionnaire flow (docs/data-model.md → Fluxo e saltos).
 *
 * The next step is the first that exists of: the chosen option's jump, the
 * step's jump, the next step by `order`; with none, the questionnaire ends.
 * A valid flow has every jump pointing to an existing step (or "__end__") and
 * NO cycle at all, so every path ends after a finite number of steps.
 */

export type FlowStep = Pick<Step, "type" | "nextStepId" | "options"> & { id: string; order: number };

/** Where a path goes after `step` (and `option`, for questions). `null` = end. */
export function resolveNext(step: FlowStep, option: Pick<StepOption, "nextStepId"> | null, ordered: FlowStep[]): string | null {
  const jump = option?.nextStepId ?? step.nextStepId;
  if (jump === END_OF_QUESTIONNAIRE) return null;
  if (jump) return jump;
  const index = ordered.findIndex((candidate) => candidate.id === step.id);
  return ordered[index + 1]?.id ?? null;
}

export type Transition = {
  /** null for the step-level transition (videos, or questions without options). */
  optionId: string | null;
  target: string | null;
};

/** Every way out of a step: one per option for questions, one for videos. */
export function transitionsOf(step: FlowStep, ordered: FlowStep[]): Transition[] {
  if (step.type === "question" && step.options.length > 0) {
    return step.options.map((option) => ({ optionId: option.id, target: resolveNext(step, option, ordered) }));
  }
  return [{ optionId: null, target: resolveNext(step, null, ordered) }];
}

export type FlowIssue =
  | { kind: "missing-target"; stepId: string; optionId: string | null; target: string }
  | { kind: "cycle"; path: string[] };

/** Jumps to a step that does not exist in this questionnaire. */
function missingTargets(ordered: FlowStep[]): FlowIssue[] {
  const ids = new Set(ordered.map((step) => step.id));
  const issues: FlowIssue[] = [];
  for (const step of ordered) {
    const jumps: Array<[string | null, string | null]> = [
      [null, step.nextStepId],
      ...step.options.map((option): [string, string | null] => [option.id, option.nextStepId]),
    ];
    for (const [optionId, target] of jumps) {
      if (target && target !== END_OF_QUESTIONNAIRE && !ids.has(target)) {
        issues.push({ kind: "missing-target", stepId: step.id, optionId, target });
      }
    }
  }
  return issues;
}

/** First cycle found (as the list of step ids, closing back on the first), or null. */
export function findCycle(ordered: FlowStep[]): string[] | null {
  const byId = new Map(ordered.map((step) => [step.id, step]));
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  function visit(id: string): string[] | null {
    state.set(id, "visiting");
    stack.push(id);
    const step = byId.get(id)!;
    for (const { target } of transitionsOf(step, ordered)) {
      if (target === null || !byId.has(target)) continue;
      if (state.get(target) === "visiting") return [...stack.slice(stack.indexOf(target)), target];
      if (!state.has(target)) {
        const cycle = visit(target);
        if (cycle) return cycle;
      }
    }
    stack.pop();
    state.set(id, "done");
    return null;
  }

  for (const step of ordered) {
    if (!state.has(step.id)) {
      const cycle = visit(step.id);
      if (cycle) return cycle;
    }
  }
  return null;
}

export function validateFlow(steps: FlowStep[]): FlowIssue[] {
  const ordered = sortSteps(steps);
  const issues = missingTargets(ordered);
  const cycle = findCycle(ordered);
  if (cycle) issues.push({ kind: "cycle", path: cycle });
  return issues;
}

/** Steps no path from the first step can reach (a warning, not an error). */
export function unreachableSteps(steps: FlowStep[]): string[] {
  const ordered = sortSteps(steps);
  if (ordered.length === 0) return [];
  const byId = new Map(ordered.map((step) => [step.id, step]));
  const reached = new Set<string>();
  const queue = [ordered[0].id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reached.has(id) || !byId.has(id)) continue;
    reached.add(id);
    for (const { target } of transitionsOf(byId.get(id)!, ordered)) if (target) queue.push(target);
  }
  return ordered.filter((step) => !reached.has(step.id)).map((step) => step.id);
}

/** The flow as it would be after deleting a step (jumps to it reset to "follow the order"). */
export function stepsAfterDelete(deletedStepId: string, steps: StepRecord[]): StepRecord[] {
  const patches = new Map(clearJumpsTo(deletedStepId, steps).map((patch) => [patch.stepId, patch]));
  return steps
    .filter((step) => step.id !== deletedStepId)
    .map((step) => {
      const patch = patches.get(step.id);
      return patch ? { ...step, nextStepId: patch.nextStepId, options: patch.options } : step;
    });
}

/** "#2 → #4 → #2", using the step order numbers the admin sees. */
export function describeCycle(path: string[], steps: ReadonlyArray<{ id: string; order: number }>): string {
  const orderOf = new Map(steps.map((step) => [step.id, step.order]));
  return path.map((id) => `#${orderOf.get(id) ?? "?"}`).join(" → ");
}
