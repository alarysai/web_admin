"use client";

import { useState, useTransition } from "react";

import type { DeleteStepResult } from "../server/save-step";

type DeleteStepButtonProps = {
  stepLabel: string;
  deleteStep: () => Promise<DeleteStepResult>;
  confirm?: (message: string) => boolean;
};

/** Asks for confirmation, then deletes. The list refreshes through revalidatePath. */
export function DeleteStepButton({ stepLabel, deleteStep, confirm = (message) => window.confirm(message) }: DeleteStepButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Excluir o passo "${stepLabel}"? Saltos que apontam para ele voltam a seguir a ordem.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteStep();
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={handleClick} disabled={pending} className="text-sm text-red-700 underline disabled:opacity-60">
        {pending ? "Excluindo…" : "Excluir"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
