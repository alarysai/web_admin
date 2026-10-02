"use client";

import { useState, useTransition } from "react";

import type { ActionResult } from "@/lib/forms/action-result";

import { ActionResultMessage } from "./ActionResultMessage";

type Action = () => Promise<ActionResult>;

type ActivationActionsProps = {
  active: boolean;
  /** Names the thing in the confirmations ("esta dica", "este anunciante"). */
  subject: string;
  activate: Action;
  deactivate: Action;
  remove: Action;
  confirm?: (message: string) => boolean;
};

/** Activate/deactivate and delete for content with an active/inactive status, with the server's answer below. */
export function ActivationActions({
  active,
  subject,
  activate,
  deactivate,
  remove,
  confirm = (message) => window.confirm(message),
}: ActivationActionsProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(action: Action, question?: string) {
    if (question && !confirm(question)) return;
    setResult(null);
    startTransition(async () => {
      // Delete redirects on success and never resolves here.
      setResult(await action());
    });
  }

  const button = "rounded-md border px-3 py-1.5 text-sm disabled:opacity-50";

  return (
    <section aria-labelledby="activation-heading" className="flex max-w-2xl flex-col gap-3 rounded-md border border-zinc-200 p-4">
      <h2 id="activation-heading" className="text-sm font-semibold">
        Status
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {active ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(deactivate, `Desativar ${subject}? Sai dos apps na hora.`)}
            className={`${button} border-zinc-300`}
          >
            Desativar
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(activate)} className={`${button} border-zinc-900 bg-zinc-900 text-white`}>
            Ativar
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(remove, `Excluir ${subject}? Não dá para desfazer.`)}
          className={`${button} border-red-300 text-red-700`}
        >
          Excluir
        </button>
        {pending && <span className="text-sm text-zinc-500">Processando…</span>}
      </div>
      {result && <ActionResultMessage result={result} />}
    </section>
  );
}
