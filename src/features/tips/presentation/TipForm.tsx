"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/form/FormMessage";
import { LocalizedTextFields } from "@/components/form/LocalizedTextFields";
import { SelectField } from "@/components/form/SelectField";
import { TextField } from "@/components/form/TextField";
import { initialFormState, type FormState } from "@/lib/forms/form-state";
import { localizedValues, resolveValues } from "@/lib/forms/initial-values";

import type { Tip } from "../domain/tip";

export type TipFormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

type TipFormProps = {
  tip: Tip | null;
  categories: ReadonlyArray<{ value: string; label: string }>;
  defaultOrder: number;
  action: TipFormAction;
  initialState?: FormState;
};

function savedValues(tip: Tip | null, defaultOrder: number): Record<string, string> {
  return {
    ...localizedValues("text", tip?.text ?? null),
    categoryId: tip?.categoryId ?? "",
    order: String(tip?.order ?? defaultOrder),
  };
}

export function TipForm({ tip, categories, defaultOrder, action, initialState = initialFormState }: TipFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = resolveValues(savedValues(tip, defaultOrder), state.values);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormMessage state={state} />

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
          hint="Posição na lista de dicas da categoria."
          required
        />
      </div>

      <LocalizedTextFields name="text" label="Texto da dica" values={values} errors={errors} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : tip ? "Salvar alterações" : "Criar dica"}
        </button>
        <Link href="/dicas" className="text-sm text-zinc-600 underline">
          Voltar para a lista
        </Link>
      </div>
    </form>
  );
}
