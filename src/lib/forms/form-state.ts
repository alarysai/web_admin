import type { z } from "zod";

/**
 * Result of a Server Action used with useActionState. `values` echoes what was
 * submitted so the form can show it again after React resets the inputs.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: Record<string, string>;
  values: Record<string, string> | null;
};

export const initialFormState: FormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: null,
};

export function formError(
  message: string | null,
  values: Record<string, string> | null,
  fieldErrors: Record<string, string> = {},
): FormState {
  return { status: "error", message, fieldErrors, values };
}

export function formSuccess(message: string): FormState {
  return { status: "success", message, fieldErrors: {}, values: null };
}

/** First message per field, keyed by dotted path ("title.pt", "order"). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}
