"use client";

import { useState } from "react";

import { displayText, type Language, type LocalizedText } from "@/lib/content/localized-text";

import type { VisitedStep } from "../domain/prompt-preview";
import { ANSWER_TYPE_LABELS, type StepOption } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";

type SimulatorStepProps = {
  step: StepRecord;
  language: Language;
  /** Active tips by id, to show the option / info flag tip like the app. */
  tipTexts: Record<string, LocalizedText>;
  /** `option` is the chosen option when it decides the jump (single choice, yes/no). */
  onAnswer: (visit: VisitedStep, option: StepOption | null) => void;
};

/** One step as the app shows it: answer UI by answer type, "Pular" on optional questions, tips. */
export function SimulatorStep({ step, language, tipTexts, onAnswer }: SimulatorStepProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const t = (value: LocalizedText | null) => displayText(value, language);

  const selectedOption = step.options.find((option) => option.id === selected[0]) ?? null;
  // The chosen option's tip wins over the info flag tip; inactive tips are simply absent from tipTexts.
  const tipId = (step.answerType !== "multiple_choice" && selectedOption?.tipId) || step.infoFlag?.tipId || null;
  const tip = tipId ? tipTexts[tipId] : undefined;

  function answer(visit: Omit<VisitedStep, "stepId" | "skipped">, option: StepOption | null) {
    onAnswer({ stepId: step.id, skipped: false, ...visit }, option);
  }

  function skip() {
    onAnswer({ stepId: step.id, optionIds: [], text: null, skipped: true }, null);
  }

  const canContinue =
    step.type === "video" ||
    (step.answerType === "open_text" ? !step.required || text.trim() !== "" : selected.length > 0 || !step.required);

  function next() {
    if (step.type === "video") return answer({ optionIds: [], text: null }, null);
    if (step.answerType === "open_text") return answer({ optionIds: [], text: text.trim() || null }, null);
    if (step.answerType === "multiple_choice") return answer({ optionIds: selected, text: null }, null);
    return answer({ optionIds: selected.slice(0, 1), text: null }, selectedOption);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          Passo #{step.order}
          {step.type === "question" && ` · ${ANSWER_TYPE_LABELS[step.answerType]}`}
        </span>
        {step.type === "question" && !step.required && (
          <button type="button" onClick={skip} className="underline">
            Pular
          </button>
        )}
      </div>

      <p className="text-base">{t(step.text) || "(sem texto)"}</p>
      {step.helpText && <p className="text-sm text-zinc-600">{t(step.helpText)}</p>}

      {step.type === "video" && step.videoUrl && (
        <a href={step.videoUrl} target="_blank" rel="noreferrer" className="text-sm underline">
          Abrir vídeo
        </a>
      )}

      {step.type === "question" && step.answerType === "open_text" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="sr-only">Sua resposta</span>
          <textarea
            value={text}
            maxLength={step.maxLength}
            placeholder={t(step.placeholder) || undefined}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2"
          />
          <span className="self-end text-xs text-zinc-500">
            {text.length}/{step.maxLength}
          </span>
          {!step.required && <span className="text-xs text-zinc-500">Opcional — você pode pular.</span>}
        </label>
      )}

      {step.type === "question" && step.answerType !== "open_text" && (
        <fieldset className={step.answerType === "yes_no" ? "flex gap-2" : "flex flex-col gap-2"}>
          <legend className="sr-only">Opções</legend>
          {step.options.map((option) => {
            const multiple = step.answerType === "multiple_choice";
            return (
              <label key={option.id} className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`simulator-${step.id}`}
                  checked={selected.includes(option.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      multiple
                        ? event.target.checked
                          ? [...current, option.id]
                          : current.filter((id) => id !== option.id)
                        : [option.id],
                    )
                  }
                />
                {t(option.text) || "(opção sem texto)"}
              </label>
            );
          })}
        </fieldset>
      )}

      {(step.infoFlag || tip) && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {step.infoFlag && <p className="font-medium">Dica: {t(step.infoFlag.label)}</p>}
          {tip && <p>{t(tip)}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={next}
        disabled={!canContinue}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  );
}
