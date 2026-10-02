"use client";

import { useState } from "react";

import { displayText, LANGUAGE_LABELS, LANGUAGES, type Language } from "@/lib/content/localized-text";

import { resolveNext } from "../domain/flow";
import { promptParts, type VisitedStep } from "../domain/prompt-preview";
import { sortSteps, type StepRecord } from "../domain/steps";

/** Safety net: the server forbids cycles, but legacy data must never hang the preview. */
const MAX_VISITS = 200;

type FlowSimulatorProps = {
  steps: StepRecord[];
};

/** Walks the questionnaire like the app would, in any language. */
export function FlowSimulator({ steps }: FlowSimulatorProps) {
  const ordered = sortSteps(steps);
  const byId = new Map(ordered.map((step) => [step.id, step]));
  const firstId = ordered[0]?.id ?? null;

  const [language, setLanguage] = useState<Language>("pt");
  const [currentId, setCurrentId] = useState<string | null>(firstId);
  const [path, setPath] = useState<VisitedStep[]>([]);

  const current = currentId ? byId.get(currentId) : undefined;
  const finished = currentId === null || !current || path.length >= MAX_VISITS;

  function choose(optionId: string | null) {
    if (!current) return;
    const option = current.options.find((candidate) => candidate.id === optionId) ?? null;
    setPath((visited) => [...visited, { stepId: current.id, optionId }]);
    setCurrentId(resolveNext(current, option, ordered));
  }

  function restart() {
    setPath([]);
    setCurrentId(firstId);
  }

  if (ordered.length === 0) {
    return <p className="text-sm text-zinc-600">Adicione passos para simular o fluxo.</p>;
  }

  const parts = promptParts(path, ordered, language);

  return (
    <section aria-labelledby="simulator-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="simulator-heading" className="text-lg font-semibold">
          Simular
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            Idioma
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1"
            >
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={restart} className="rounded-md border border-zinc-300 px-3 py-1">
            Recomeçar
          </button>
        </div>
      </div>

      <div className="rounded-md border border-zinc-300 bg-zinc-50 p-5" aria-live="polite">
        {finished ? (
          <p className="font-medium">
            {currentId !== null && !current ? `Salto para um passo que não existe (${currentId}).` : "Fim do questionário."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="text-xs text-zinc-500">Passo #{current.order}</span>
            <p className="text-base">{displayText(current.text, language) || "(sem texto)"}</p>
            {current.type === "video" ? (
              <>
                {current.videoUrl && (
                  <a href={current.videoUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                    Abrir vídeo
                  </a>
                )}
                <button type="button" onClick={() => choose(null)} className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">
                  Continuar
                </button>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {current.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => choose(option.id)}
                    className="rounded-md border border-zinc-400 bg-white px-4 py-2 text-sm"
                  >
                    {displayText(option.text, language) || "(opção sem texto)"}
                  </button>
                ))}
              </div>
            )}
            {current.infoFlag && (
              <p className="text-xs text-zinc-600">
                {displayText(current.infoFlag.label, language)} {current.infoFlag.value ? "Sim" : "Não"}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="text-sm">
        <h3 className="font-semibold">Partes do prompt (prévia)</h3>
        {parts.length === 0 ? (
          <p className="text-zinc-600">Nenhum passo marcado com “vira parte do prompt?” foi respondido ainda.</p>
        ) : (
          <ol className="mt-1 list-decimal pl-5">
            {parts.map((part, index) => (
              <li key={`${part.stepId}-${index}`}>
                {part.answer ? <span>Resposta: “{part.answer}”</span> : <span>Passo #{byId.get(part.stepId)?.order}</span>}
                {part.instructions.length > 0 && <span className="text-zinc-600"> · Instruções: {part.instructions.join(" / ")}</span>}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-1 text-xs text-zinc-500">O texto final do prompt é montado pelo serviço de geração.</p>
      </div>
    </section>
  );
}
