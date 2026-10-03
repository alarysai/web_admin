import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";

import { ANSWER_TYPE_LABELS, answerTypeHasOptions } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";
import type { DeleteStepResult } from "../server/save-step";
import { DeleteStepButton } from "./DeleteStepButton";
import { STEP_TYPE_LABELS } from "./step-values";

type StepListProps = {
  questionnaireId: string;
  steps: StepRecord[];
  /** Server Action bound per step by the page. */
  deleteAction: (stepId: string) => () => Promise<DeleteStepResult>;
};

/** "Múltipla escolha · 3 opções", "Resposta aberta · até 280 caracteres". */
function answerSummary(step: StepRecord): string {
  const detail = answerTypeHasOptions(step.answerType)
    ? `${step.options.length} ${step.options.length === 1 ? "opção" : "opções"}`
    : `até ${step.maxLength} caracteres`;
  return `${ANSWER_TYPE_LABELS[step.answerType]} · ${detail}`;
}

function summary(step: StepRecord): string {
  const text = step.text?.pt ?? "";
  return text.length > 80 ? `${text.slice(0, 79)}…` : text || "(sem texto)";
}

/** Steps in flow order, with what matters at a glance and the edit/delete actions. */
export function StepList({ questionnaireId, steps, deleteAction }: StepListProps) {
  if (steps.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600">
        Nenhum passo ainda.{" "}
        <Link href={`/questionarios/${questionnaireId}/passos/novo`} className="underline">
          Criar o primeiro passo
        </Link>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step) => (
        <li key={step.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>#{step.order}</span>
              <StatusBadge label={STEP_TYPE_LABELS[step.type]} tone="neutral" />
              {step.type === "question" && <span>{answerSummary(step)}</span>}
              {step.type === "question" && !step.required && <StatusBadge label="Opcional" tone="neutral" />}
              {step.partOfPrompt && <StatusBadge label="Entra no prompt" tone="positive" />}
              {step.infoFlag && <StatusBadge label="Informação booleana" tone="neutral" />}
            </div>
            <span className="truncate text-sm">{summary(step)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/questionarios/${questionnaireId}/passos/${step.id}`} className="text-sm underline">
              Editar
            </Link>
            <DeleteStepButton stepLabel={summary(step)} deleteStep={deleteAction(step.id)} />
          </div>
        </li>
      ))}
    </ol>
  );
}
