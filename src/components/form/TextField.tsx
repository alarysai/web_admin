import type { InputHTMLAttributes } from "react";

type TextFieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

/**
 * Labelled input. The hint/error sits outside the <label> so it is not read as
 * part of the field name, and is linked through aria-describedby instead.
 */
export function TextField({ label, name, error, hint, className, id, ...input }: TextFieldProps) {
  const inputId = id ?? `field-${name}`;
  const messageId = `${inputId}-message`;
  return (
    <div className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <label htmlFor={inputId} className="font-medium">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`rounded-md border px-3 py-2 ${error ? "border-red-500" : "border-zinc-300"}`}
        {...input}
      />
      {(error || hint) && (
        <span id={messageId} className={`text-xs ${error ? "text-red-600" : "text-zinc-500"}`}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}
