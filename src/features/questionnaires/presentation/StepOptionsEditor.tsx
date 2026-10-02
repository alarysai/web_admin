"use client";

import { LocalizedTextFields } from "@/components/form/LocalizedTextFields";
import { TextAreaField } from "@/components/form/TextAreaField";

type StepOptionsEditorProps = {
  optionIds: string[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onAdd: () => void;
  onRemove: (optionId: string) => void;
};

/** Answer options of a question. Field names use the option id (see server/step-form.ts). */
export function StepOptionsEditor({ optionIds, values, errors, onAdd, onRemove }: StepOptionsEditorProps) {
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
            <input type="hidden" name={`${base}.nextStepId`} defaultValue={values[`${base}.nextStepId`] ?? ""} />
            <LocalizedTextFields name={`${base}.text`} label="Texto da opção" values={values} errors={errors} />
            <TextAreaField
              name={`${base}.promptInstruction`}
              label="Instrução de prompt (opcional)"
              defaultValue={values[`${base}.promptInstruction`] ?? ""}
              error={errors[`${base}.promptInstruction`]}
              hint="Enviada à IA quando o usuário escolhe esta opção."
              rows={2}
            />
          </div>
        );
      })}
    </section>
  );
}
