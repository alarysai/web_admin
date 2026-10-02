"use client";

import { useEffect } from "react";

/** Shown when a panel page fails to load (e.g. Firestore unavailable). */
export default function PainelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[painel] page failed", error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 p-6">
      <h2 className="font-semibold text-red-800">Não foi possível carregar esta página.</h2>
      <p className="text-sm text-red-700">Verifique a conexão e tente de novo. Se continuar, avise o suporte.</p>
      <button type="button" onClick={reset} className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm">
        Tentar de novo
      </button>
    </div>
  );
}
