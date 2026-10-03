"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/form/FormMessage";
import { LocalizedTextFields } from "@/components/form/LocalizedTextFields";
import { SelectField } from "@/components/form/SelectField";
import { TextField } from "@/components/form/TextField";
import { initialFormState, type FormState } from "@/lib/forms/form-state";
import { localizedValues, resolveValues } from "@/lib/forms/initial-values";

import type { Questionnaire } from "../domain/questionnaire";

export type QuestionnaireFormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

type QuestionnaireFormProps = {
  questionnaire: Questionnaire | null;
  categories: ReadonlyArray<{ value: string; label: string }>;
  action: QuestionnaireFormAction;
  initialState?: FormState;
};

function savedValues(questionnaire: Questionnaire | null): Record<string, string> {
  return {
    ...localizedValues("title", questionnaire?.title ?? null),
    ...localizedValues("description", questionnaire?.description ?? null),
    categoryId: questionnaire?.categoryId ?? "",
    order: String(questionnaire?.order ?? 0),
    creditCost: questionnaire?.creditCost === null || questionnaire?.creditCost === undefined ? "" : String(questionnaire.creditCost),
  };
}

/** Create/edit form for the questionnaire's own fields. Steps get their own editor. */
export function QuestionnaireForm({ questionnaire, categories, action, initialState = initialFormState }: QuestionnaireFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = resolveValues(savedValues(questionnaire), state.values);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormMessage state={state} />

      <LocalizedTextFields name="title" label="Título" values={values} errors={errors} />
      <LocalizedTextFields name="description" label="Descrição" values={values} errors={errors} optional />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="categoryId"
          label="Categoria *"
          options={categories}
          placeholder="Escolha uma categoria"
          defaultValue={values.categoryId}
          error={errors.categoryId}
          required
        />
        <TextField
          name="order"
          label="Ordem *"
          type="number"
          min={0}
          step={1}
          defaultValue={values.order}
          error={errors.order}
          hint="Posição na grade da categoria (menor aparece primeiro)."
          required
        />
      </div>

      <TextField
        name="creditCost"
        label="Custo em créditos (opcional)"
        type="number"
        min={0}
        step={1}
        defaultValue={values.creditCost}
        error={errors.creditCost}
        hint="Só informativo: o app mostra “Custo: N créditos” na revisão. O débito real é feito pelo servidor. Vazio = não mostra."
        className="max-w-xs"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : questionnaire ? "Salvar alterações" : "Criar questionário"}
        </button>
        <Link href="/questionarios" className="text-sm text-zinc-600 underline">
          Voltar para a lista
        </Link>
      </div>
    </form>
  );
}
