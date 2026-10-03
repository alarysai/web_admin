import { END_OF_QUESTIONNAIRE, optionJumpsApply, type Step, type StepOption } from "./schemas";
import { clearJumpsTo, sortSteps, type StepRecord } from "./steps";

/**
 * Questionnaire flow (docs/data-model.md → Fluxo e saltos).
 *
 * The next step is the first that exists of: the chosen option's jump, the
 * step's jump, the next step by `order`; with none, the questionnaire ends.
 * Option jumps only count where one option decides (single choice, yes/no);
 * multiple choice, open answers and "Pular" (optional questions) follow the
 * step's jump.
 * A valid flow has every jump pointing to an existing step (or "__end__") and
 * NO cycle at all, so every path ends after a finite number of steps.
 */

export type FlowStep = Pick<Step, "type" | "nextStepId" | "options" | "answerType" | "required"> & { id: string; order: number };

/** Whether this step's options carry their own jump. */
function usesOptionJumps(step: FlowStep): boolean {
  return step.type === "question" && optionJumpsApply(step.answerType);
}

/**
 * Where a path goes after `step`. `option` is the chosen option of a single
 * choice / yes-no question; pass null for videos, multiple choice, open
 * answers and skips. `null` = end.
 */
export function resolveNext(step: FlowStep, option: Pick<StepOption, "nextStepId"> | null, ordered: FlowStep[]): string | null {
  const optionJump = option && usesOptionJumps(step) ? option.nextStepId : null;
  const jump = optionJump ?? step.nextStepId;
  if (jump === END_OF_QUESTIONNAIRE) return null;
  if (jump) return jump;
  const index = ordered.findIndex((candidate) => candidate.id === step.id);
  return ordered[index + 1]?.id ?? null;
}

export type Transition = {
  /** "option": choosing that option · "continue": the step-level way out · "skip": "Pular" on an optional question. */
  via: "option" | "continue" | "skip";
  /** Set only when via == "option". */
  optionId: string | null;
  target: string | null;
};

/**
 * Every way out of a step: one per option when options decide the jump
 * (single choice, yes/no), otherwise a single "continue"; optional questions
 * also get a "skip", which follows the step's jump.
 */
export function transitionsOf(step: FlowStep, ordered: FlowStep[]): Transition[] {
  const stepTarget = resolveNext(step, null, ordered);
  const transitions: Transition[] =
    usesOptionJumps(step) && step.options.length > 0
      ? step.options.map((option) => ({ via: "option", optionId: option.id, target: resolveNext(step, option, ordered) }))
      : [{ via: "continue", optionId: null, target: stepTarget }];

  if (step.type === "question" && !step.required) transitions.push({ via: "skip", optionId: null, target: stepTarget });
  return transitions;
}

export type FlowIssue =
  | { kind: "missing-target"; stepId: string; optionId: string | null; target: string }
  | { kind: "cycle"; path: string[] };

/** Jumps to a step that does not exist in this questionnaire. */
function missingTargets(ordered: FlowStep[]): FlowIssue[] {
  const ids = new Set(ordered.map((step) => step.id));
  const issues: FlowIssue[] = [];
  for (const step of ordered) {
    const optionJumps = usesOptionJumps(step)
      ? step.options.map((option): [string, string | null] => [option.id, option.nextStepId])
      : [];
    const jumps: Array<[string | null, string | null]> = [[null, step.nextStepId], ...optionJumps];
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
