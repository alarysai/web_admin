import type { TextareaHTMLAttributes } from "react";

type TextAreaFieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name">;

/** Multi-line version of TextField (same label/message structure). */
export function TextAreaField({ label, name, error, hint, className, id, rows = 3, ...textarea }: TextAreaFieldProps) {
  const fieldId = id ?? `field-${name}`;
  const messageId = `${fieldId}-message`;
  return (
    <div className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <label htmlFor={fieldId} className="font-medium">
        {label}
      </label>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`rounded-md border px-3 py-2 ${error ? "border-red-500" : "border-zinc-300"}`}
        {...textarea}
      />
      {(error || hint) && (
        <span id={messageId} className={`text-xs ${error ? "text-red-600" : "text-zinc-500"}`}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}
