"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/form/FormMessage";
import { LocalizedTextFields } from "@/components/form/LocalizedTextFields";
import { SelectField } from "@/components/form/SelectField";
import { TextField } from "@/components/form/TextField";
import { initialFormState, type FormState } from "@/lib/forms/form-state";
import { localizedValues, resolveValues } from "@/lib/forms/initial-values";

import { CATEGORY_STATUS_LABELS, CATEGORY_STATUSES, type Category } from "../domain/category";

export type CategoryFormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

type CategoryFormProps = {
  category: Category | null;
  /** Panel section of this kind of category ("Voltar para a lista"). */
  basePath: string;
  action: CategoryFormAction;
  initialState?: FormState;
};

const STATUS_OPTIONS = CATEGORY_STATUSES.map((status) => ({ value: status, label: CATEGORY_STATUS_LABELS[status] }));

function savedValues(category: Category | null): Record<string, string> {
  return {
    ...localizedValues("name", category?.name ?? null),
    order: String(category?.order ?? 0),
    status: category?.status ?? "active",
  };
}

export function CategoryForm({ category, basePath, action, initialState = initialFormState }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = resolveValues(savedValues(category), state.values);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormMessage state={state} />

      <LocalizedTextFields name="name" label="Nome" values={values} errors={errors} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="order"
          label="Ordem *"
          type="number"
          min={0}
          step={1}
          defaultValue={values.order}
          error={errors.order}
          hint="Posição na grade do app (menor aparece primeiro)."
          required
        />
        <SelectField
          name="status"
          label="Status *"
          options={STATUS_OPTIONS}
          defaultValue={values.status}
          error={errors.status}
          required
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : category ? "Salvar alterações" : "Criar categoria"}
        </button>
        <Link href={basePath} className="text-sm text-zinc-600 underline">
          Voltar para a lista
        </Link>
      </div>
    </form>
  );
}
