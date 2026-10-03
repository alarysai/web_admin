import { asEnum, asImage, asNumber, asOptionalLocalizedText, asString } from "@/lib/content/firestore-mapping";

import {
  ANSWER_TYPES,
  DEFAULT_ANSWER_FIELDS,
  MAX_LENGTH_LIMIT,
  STEP_TYPES,
  type InfoFlag,
  type StepOption,
} from "../domain/schemas";
import type { StepRecord } from "../domain/steps";

function asOption(value: unknown, index: number): StepOption {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: asString(raw.id) ?? `option-${index + 1}`,
    text: asOptionalLocalizedText(raw.text),
    image: asImage(raw.image),
    promptInstruction: asString(raw.promptInstruction),
    nextStepId: asString(raw.nextStepId),
    tipId: asString(raw.tipId),
  };
}

/** Same limits as the schema; anything else falls back to the default the apps use. */
function asMaxLength(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_LENGTH_LIMIT
    ? value
    : DEFAULT_ANSWER_FIELDS.maxLength;
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
    // v2 fields: documents saved before them read as the defaults the apps assume.
    answerType: asEnum(raw.answerType, ANSWER_TYPES, DEFAULT_ANSWER_FIELDS.answerType),
    helpText: asOptionalLocalizedText(raw.helpText),
    required: raw.required !== false,
    maxLength: asMaxLength(raw.maxLength),
    placeholder: asOptionalLocalizedText(raw.placeholder),
  };
}
