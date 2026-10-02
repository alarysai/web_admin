import type { LocalizedText } from "./localized-text";

/**
 * Defensive readers for Firestore documents: a missing or wrongly typed field
 * becomes a safe default instead of breaking the whole list.
 */
export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asLocalizedText(value: unknown): LocalizedText {
  const raw = (value ?? {}) as Record<string, unknown>;
  return { pt: asString(raw.pt) ?? "", en: asString(raw.en), es: asString(raw.es) };
}

export function asOptionalLocalizedText(value: unknown): LocalizedText | null {
  return value && typeof value === "object" ? asLocalizedText(value) : null;
}

/** Firestore Timestamp (anything with toDate) → Date. */
export function asDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
