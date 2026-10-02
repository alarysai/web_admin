"use client";

import { useState, useTransition } from "react";

import { ActionResultMessage } from "@/components/form/ActionResultMessage";

import type { QuestionnaireStatus } from "../domain/schemas";
import type { LifecycleResult } from "../server/questionnaire-lifecycle";

type Action = () => Promise<LifecycleResult>;

type QuestionnaireActionsProps = {
  status: QuestionnaireStatus;
  title: string;
  publish: Action;
  unpublish: Action;
  duplicate: Action;
  remove: Action;
  confirm?: (message: string) => boolean;
};

/** Publish/unpublish, duplicate and delete, with the server's answer shown below the buttons. */
export function QuestionnaireActions({
  status,
  title,
  publish,
  unpublish,
  duplicate,
  remove,
  confirm = (message) => window.confirm(message),
}: QuestionnaireActionsProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<LifecycleResult | null>(null);
  const published = status === "published";

  function run(action: Action, question?: string) {
    if (question && !confirm(question)) return;
    setResult(null);
    startTransition(async () => {
      // Duplicate and delete redirect on success and never resolve here.
      setResult(await action());
    });
  }

  const button = "rounded-md border px-3 py-1.5 text-sm disabled:opacity-50";

  return (
    <section aria-labelledby="actions-heading" className="flex max-w-3xl flex-col gap-3 rounded-md border border-zinc-200 p-4">
      <h2 id="actions-heading" className="text-sm font-semibold">
        Publicação
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {published ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(unpublish, `Despublicar "${title}"? Ele sai dos apps na hora.`)}
            className={`${button} border-zinc-300`}
          >
            Despublicar
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(publish)} className={`${button} border-zinc-900 bg-zinc-900 text-white`}>
            Publicar
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => run(duplicate)} className={`${button} border-zinc-300`}>
          Duplicar
        </button>
        <button
          type="button"
          disabled={pending || published}
          onClick={() => run(remove, `Excluir "${title}" e todos os passos? Não dá para desfazer.`)}
          className={`${button} border-red-300 text-red-700`}
        >
          Excluir
        </button>
        {pending && <span className="text-sm text-zinc-500">Processando…</span>}
      </div>
      {published && <p className="text-xs text-zinc-500">Para excluir, despublique primeiro.</p>}

      {result && <ActionResultMessage result={result} />}
    </section>
  );
}
