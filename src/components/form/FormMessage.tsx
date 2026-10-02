import type { FormState } from "@/lib/forms/form-state";

/** Form-level feedback: error as an alert, success as a polite status. */
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.message}
      </p>
    );
  }
  return (
    <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
      {state.message}
    </p>
  );
}
