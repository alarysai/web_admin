"use client";

import { LocalizedTextFields } from "@/components/form/LocalizedTextFields";
import { SelectField } from "@/components/form/SelectField";
import { TextAreaField } from "@/components/form/TextAreaField";

import { jumpChoices, type JumpTarget } from "./jump-choices";
import { tipSelectOptions } from "./step-values";

type StepOptionsEditorProps = {
  optionIds: string[];
  jumpTargets: JumpTarget[];
  /** Option jumps only exist where one option decides the next step (single choice, yes/no). */
  showJumps: boolean;
  tipChoices: ReadonlyArray<{ value: string; label: string }>;
  /** Extra rule shown under the title (e.g. "exactly 2 options" for yes/no). */
  hint?: string;
  values: Record<string, string>;
  errors: Record<string, string>;
  onAdd: () => void;
  onRemove: (optionId: string) => void;
};

/** Answer options of a question. Field names use the option id (see server/step-form.ts). */
export function StepOptionsEditor({
  optionIds,
  jumpTargets,
  showJumps,
  tipChoices,
  hint,
  values,
  errors,
  onAdd,
  onRemove,
}: StepOptionsEditorProps) {
  return (
    <section aria-labelledby="options-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="options-heading" className="text-sm font-semibold">
          Opções de resposta
        </h2>
        <button type="button" onClick={onAdd} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
          Adicionar opção
        </button>
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {errors.options && (
        <p role="alert" className="text-xs text-red-600">
          {errors.options}
        </p>
      )}

      {optionIds.map((optionId, index) => {
        const base = `options.${optionId}`;
        return (
          <div key={optionId} className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Opção {index + 1}</span>
              <button
                type="button"
                onClick={() => onRemove(optionId)}
                disabled={optionIds.length === 1}
                aria-label={`Remover opção ${index + 1}`}
                className="text-sm text-red-700 underline disabled:text-zinc-400 disabled:no-underline"
              >
                Remover
              </button>
            </div>
            <input type="hidden" name={`${base}.id`} value={optionId} />
            <LocalizedTextFields name={`${base}.text`} label="Texto da opção" values={values} errors={errors} />
            <TextAreaField
              name={`${base}.promptInstruction`}
              label="Instrução de prompt (opcional)"
              defaultValue={values[`${base}.promptInstruction`] ?? ""}
              error={errors[`${base}.promptInstruction`]}
              hint="Enviada à IA quando o usuário escolhe esta opção."
              rows={2}
            />
            {showJumps && (
              <SelectField
                name={`${base}.nextStepId`}
                label="Depois desta opção"
                options={jumpChoices(jumpTargets, "Usar o “Próximo passo” do passo", values[`${base}.nextStepId`] ?? "")}
                defaultValue={values[`${base}.nextStepId`] ?? ""}
                error={errors[`${base}.nextStepId`]}
              />
            )}
            <SelectField
              name={`${base}.tipId`}
              label="Dica desta opção (opcional)"
              options={tipSelectOptions(tipChoices, values[`${base}.tipId`] ?? "")}
              placeholder="Nenhuma dica"
              defaultValue={values[`${base}.tipId`] ?? ""}
              error={errors[`${base}.tipId`]}
            />
          </div>
        );
      })}
    </section>
  );
}
