import type { SelectHTMLAttributes } from "react";

type SelectFieldProps = {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name">;

/** Labelled select; the error is linked through aria-describedby (see TextField). */
export function SelectField({ label, name, options, placeholder, error, className, id, ...select }: SelectFieldProps) {
  const selectId = id ?? `field-${name}`;
  const messageId = `${selectId}-message`;
  return (
    <div className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <label htmlFor={selectId} className="font-medium">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className={`rounded-md border bg-white px-3 py-2 ${error ? "border-red-500" : "border-zinc-300"}`}
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={messageId} className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
