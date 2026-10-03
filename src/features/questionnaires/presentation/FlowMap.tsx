import { describeCycle, transitionsOf, type FlowIssue, type Transition } from "../domain/flow";
import { ANSWER_TYPE_LABELS } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";
import { STEP_TYPE_LABELS } from "./step-values";

type FlowMapProps = {
  steps: StepRecord[];
  issues: FlowIssue[];
  unreachable: string[];
};

function stepName(step: StepRecord | undefined, id: string): string {
  if (!step) return `passo inexistente (${id})`;
  return `#${step.order} · ${step.text?.pt || "(sem texto)"}`;
}

function transitionLabel(transition: Transition, step: StepRecord): string {
  if (transition.via === "skip") return "Pular";
  if (transition.via === "continue") return "Continuar";
  const option = step.options.find((candidate) => candidate.id === transition.optionId);
  return `“${option?.text?.pt || "(opção sem texto)"}”`;
}

/** Static view of the flow: problems first, then every way out of every step. */
export function FlowMap({ steps, issues, unreachable }: FlowMapProps) {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const unreachableSet = new Set(unreachable);

  return (
    <section aria-labelledby="map-heading" className="flex flex-col gap-3">
      <h2 id="map-heading" className="text-lg font-semibold">
        Mapa do fluxo
      </h2>

      {issues.length === 0 ? (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Fluxo válido: todos os saltos apontam para passos existentes e não há ciclos.
        </p>
      ) : (
        <ul role="alert" className="flex flex-col gap-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {issues.map((issue, index) =>
            issue.kind === "cycle" ? (
              <li key={index}>Ciclo no fluxo: {describeCycle(issue.path, steps)}. Todo caminho precisa chegar ao fim.</li>
            ) : (
              <li key={index}>
                {stepName(byId.get(issue.stepId), issue.stepId)}
                {issue.optionId ? " (uma opção)" : ""} salta para um passo que não existe ({issue.target}).
              </li>
            ),
          )}
        </ul>
      )}

      {unreachable.length > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nenhum caminho chega a: {unreachable.map((id) => stepName(byId.get(id), id)).join("; ")}.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`rounded-md border px-4 py-3 text-sm ${unreachableSet.has(step.id) ? "border-amber-300" : "border-zinc-200"}`}
          >
            <div className="font-medium">
              {stepName(step, step.id)}{" "}
              <span className="text-xs text-zinc-500">
                ({STEP_TYPE_LABELS[step.type]}
                {step.type === "question" && ` · ${ANSWER_TYPE_LABELS[step.answerType]}${step.required ? "" : " · opcional"}`})
              </span>
            </div>
            <ul className="mt-1 flex flex-col gap-0.5 text-zinc-600">
              {transitionsOf(step, steps).map((transition) => (
                <li key={`${transition.via}-${transition.optionId ?? ""}`}>
                  {transitionLabel(transition, step)} →{" "}
                  {transition.target === null ? "Fim" : stepName(byId.get(transition.target), transition.target)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
