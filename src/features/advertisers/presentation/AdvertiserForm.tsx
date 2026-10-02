"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/form/FormMessage";
import { TextField } from "@/components/form/TextField";
import { initialFormState, type FormState } from "@/lib/forms/form-state";
import { resolveValues } from "@/lib/forms/initial-values";

import { ADVERTISER_TYPE_MAX_LENGTH, type Advertiser } from "../domain/advertiser";

export type AdvertiserFormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

type AdvertiserFormProps = {
  advertiser: Advertiser | null;
  /** Types already in use, suggested while typing so the same type is spelled the same way. */
  knownTypes: string[];
  defaultOrder: number;
  action: AdvertiserFormAction;
  initialState?: FormState;
};

function savedValues(advertiser: Advertiser | null, defaultOrder: number): Record<string, string> {
  return {
    name: advertiser?.name ?? "",
    type: advertiser?.type ?? "",
    link: advertiser?.link ?? "",
    order: String(advertiser?.order ?? defaultOrder),
  };
}

export function AdvertiserForm({ advertiser, knownTypes, defaultOrder, action, initialState = initialFormState }: AdvertiserFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = resolveValues(savedValues(advertiser, defaultOrder), state.values);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormMessage state={state} />

      <TextField
        name="name"
        label="Nome *"
        defaultValue={values.name}
        error={errors.name}
        hint="Obrigatório enquanto não há upload de imagem (o anunciante precisa de nome ou imagem)."
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="type"
          label="Tipo *"
          list="advertiser-types"
          maxLength={ADVERTISER_TYPE_MAX_LENGTH}
          defaultValue={values.type}
          error={errors.type}
          hint={knownTypes.length > 0 ? "Escolha um tipo já usado ou digite um novo." : "Ex.: Patrocinador, Parceiro, Banner."}
          required
        />
        <datalist id="advertiser-types">
          {knownTypes.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
        <TextField
          name="order"
          label="Ordem *"
          type="number"
          min={0}
          step={1}
          defaultValue={values.order}
          error={errors.order}
          hint="Posição na lista de anunciantes do app."
          required
        />
      </div>

      <TextField
        name="link"
        label="Link *"
        type="url"
        placeholder="https://site.com.br"
        defaultValue={values.link}
        error={errors.link}
        hint="Aberto quando o usuário toca no anúncio. Precisa começar com https://."
        required
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : advertiser ? "Salvar alterações" : "Criar anunciante"}
        </button>
        <Link href="/anunciantes" className="text-sm text-zinc-600 underline">
          Voltar para a lista
        </Link>
      </div>
    </form>
  );
}
