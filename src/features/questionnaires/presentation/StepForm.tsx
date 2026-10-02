"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/form/FormMessage";
import { LocalizedTextFields } from "@/components/form/LocalizedTextFields";
import { SelectField } from "@/components/form/SelectField";
import { TextAreaField } from "@/components/form/TextAreaField";
import { TextField } from "@/components/form/TextField";
import { initialFormState, type FormState } from "@/lib/forms/form-state";
import { resolveValues } from "@/lib/forms/initial-values";

import { STEP_TYPES, type StepType } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";
import { jumpChoices, type JumpTarget } from "./jump-choices";
import { StepOptionsEditor } from "./StepOptionsEditor";
import { newOptionId, STEP_TYPE_LABELS, stepSavedValues } from "./step-values";

export type StepFormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

type StepFormProps = {
  questionnaireId: string;
  step: StepRecord | null;
  defaultOrder: number;
  /** Id of the first option of a new step, generated on the server to keep hydration stable. */
  initialOptionId: string;
  /** Other steps of the questionnaire this step (or its options) can jump to. */
  jumpTargets: JumpTarget[];
  action: StepFormAction;
  initialState?: FormState;
};

export function StepForm({
  questionnaireId,
  step,
  defaultOrder,
  initialOptionId,
  jumpTargets,
  action,
  initialState = initialFormState,
}: StepFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = resolveValues(stepSavedValues(step, defaultOrder), state.values);
  const errors = state.fieldErrors;

  // UI state: which type is selected, which options exist, whether the info flag is on.
  const [type, setType] = useState<StepType>(values.type === "video" ? "video" : "question");
  const [optionIds, setOptionIds] = useState<string[]>(() =>
    step && step.options.length > 0 ? step.options.map((option) => option.id) : [initialOptionId],
  );
  const [infoFlagEnabled, setInfoFlagEnabled] = useState(values["infoFlag.enabled"] === "on");

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      <FormMessage state={state} />
      <input type="hidden" name="infoFlag.tipId" defaultValue={values["infoFlag.tipId"]} />

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">Tipo *</legend>
          {STEP_TYPES.map((stepType) => (
            <label key={stepType} className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value={stepType}
                checked={type === stepType}
                onChange={() => setType(stepType)}
              />
              {STEP_TYPE_LABELS[stepType]}
            </label>
          ))}
          {errors.type && <span className="text-xs text-red-600">{errors.type}</span>}
        </fieldset>
        <TextField
          name="order"
          label="Ordem *"
          type="number"
          min={0}
          step={1}
          defaultValue={values.order}
          error={errors.order}
          hint="Ordem do fluxo (menor vem primeiro)."
          required
        />
      </div>

      <LocalizedTextFields name="text" label={type === "video" ? "Descrição do vídeo" : "Pergunta"} values={values} errors={errors} />

      {type === "video" ? (
        <TextField
          name="videoUrl"
          label="Link do vídeo *"
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          defaultValue={values.videoUrl}
          error={errors.videoUrl}
          hint="Link externo (YouTube, Vimeo…). Precisa começar com https://."
          required
        />
      ) : (
        <StepOptionsEditor
          optionIds={optionIds}
          jumpTargets={jumpTargets}
          values={values}
          errors={errors}
          onAdd={() => setOptionIds((ids) => [...ids, newOptionId()])}
          onRemove={(id) => setOptionIds((ids) => ids.filter((optionId) => optionId !== id))}
        />
      )}

      <section aria-labelledby="flow-heading" className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4">
        <h2 id="flow-heading" className="text-sm font-semibold">
          Fluxo
        </h2>
        <SelectField
          name="nextStepId"
          label="Próximo passo"
          options={jumpChoices(jumpTargets, "Seguir a ordem", values.nextStepId)}
          defaultValue={values.nextStepId}
          error={errors.nextStepId}
        />
        <p className="text-xs text-zinc-500">
          {type === "question"
            ? "Vale para as opções que não têm um destino próprio. O fluxo não pode ter ciclos: todo caminho precisa chegar ao fim."
            : "O fluxo não pode ter ciclos: todo caminho precisa chegar ao fim."}
        </p>
      </section>

      <section aria-labelledby="prompt-heading" className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4">
        <h2 id="prompt-heading" className="text-sm font-semibold">
          Prompt
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="partOfPrompt" defaultChecked={values.partOfPrompt === "on"} />
          Vira parte do prompt?
        </label>
        <TextAreaField
          name="promptInstruction"
          label="Instrução de prompt do passo (opcional)"
          defaultValue={values.promptInstruction}
          error={errors.promptInstruction}
          hint="Não é traduzida: vai direto para a IA."
        />
      </section>

      <section aria-labelledby="info-heading" className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4">
        <h2 id="info-heading" className="text-sm font-semibold">
          Informação booleana
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="infoFlag.enabled"
            checked={infoFlagEnabled}
            onChange={(event) => setInfoFlagEnabled(event.target.checked)}
          />
          Este passo tem uma informação booleana (ex.: “Isso é ético?”)
        </label>
        {infoFlagEnabled && (
          <>
            <LocalizedTextFields name="infoFlag.label" label="Pergunta informativa" values={values} errors={errors} />
            <fieldset className="flex gap-4 text-sm">
              <legend className="mb-1 font-medium">Resposta</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="infoFlag.value" value="true" defaultChecked={values["infoFlag.value"] === "true"} />
                Sim
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="infoFlag.value" value="false" defaultChecked={values["infoFlag.value"] !== "true"} />
                Não
              </label>
            </fieldset>
            <p className="text-xs text-zinc-500">A ligação com uma dica fica disponível com o cadastro de Dicas.</p>
          </>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : step ? "Salvar passo" : "Criar passo"}
        </button>
        <Link href={`/questionarios/${questionnaireId}`} className="text-sm text-zinc-600 underline">
          Voltar para o questionário
        </Link>
      </div>
    </form>
  );
}
