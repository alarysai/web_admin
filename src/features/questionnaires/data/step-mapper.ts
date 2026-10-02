import { asEnum, asNumber, asOptionalLocalizedText, asString } from "@/lib/content/firestore-mapping";

import { STEP_TYPES, type InfoFlag, type StepOption } from "../domain/schemas";
import type { StepRecord } from "../domain/steps";

function asImage(value: unknown) {
  const raw = value as { path?: unknown; url?: unknown } | null;
  const path = asString(raw?.path);
  const url = asString(raw?.url);
  return path && url ? { path, url } : null;
}

function asOption(value: unknown, index: number): StepOption {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: asString(raw.id) ?? `option-${index + 1}`,
    text: asOptionalLocalizedText(raw.text),
    image: asImage(raw.image),
    promptInstruction: asString(raw.promptInstruction),
    nextStepId: asString(raw.nextStepId),
  };
}

function asInfoFlag(value: unknown): InfoFlag | null {
  const raw = value as Record<string, unknown> | null;
  const label = asOptionalLocalizedText(raw?.label);
  if (!raw || !label) return null;
  return { label, value: raw.value === true, tipId: asString(raw.tipId) };
}

/**
 * Firestore step document → StepRecord. Defensive like the other mappers: a
 * malformed field becomes a neutral value so the editor still opens it.
 */
export function toStep(id: string, data: Record<string, unknown> | undefined): StepRecord {
  const raw = data ?? {};
  return {
    id,
    order: asNumber(raw.order),
    type: asEnum(raw.type, STEP_TYPES, "question"),
    text: asOptionalLocalizedText(raw.text),
    image: asImage(raw.image),
    videoUrl: asString(raw.videoUrl),
    options: Array.isArray(raw.options) ? raw.options.map(asOption) : [],
    nextStepId: asString(raw.nextStepId),
    partOfPrompt: raw.partOfPrompt === true,
    promptInstruction: asString(raw.promptInstruction),
    infoFlag: asInfoFlag(raw.infoFlag),
  };
}
