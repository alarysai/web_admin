import { LANGUAGE_LABELS, LANGUAGES } from "@/lib/content/localized-text";

import { TextField } from "./TextField";

type LocalizedTextFieldsProps = {
  /** Base name: inputs are `<name>.pt`, `<name>.en`, `<name>.es`. */
  name: string;
  label: string;
  /** Value per language, already resolved (submitted value or saved one). */
  values: Record<string, string>;
  errors: Record<string, string>;
  /** Portuguese is required unless the whole field is optional. */
  optional?: boolean;
};

/** One field per language (PT, EN, ES). Blank EN/ES fall back to PT in the apps. */
export function LocalizedTextFields({ name, label, values, errors, optional = false }: LocalizedTextFieldsProps) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4">
      <legend className="px-1 text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-zinc-500"> (opcional)</span>}
      </legend>
      {LANGUAGES.map((language) => {
        const fieldName = `${name}.${language}`;
        const required = language === "pt" && !optional;
        return (
          <TextField
            key={language}
            name={fieldName}
            label={`${LANGUAGE_LABELS[language]}${required ? " *" : ""}`}
            defaultValue={values[fieldName] ?? ""}
            error={errors[fieldName]}
            required={required}
            hint={language === "pt" ? undefined : "Se ficar vazio, o app mostra o texto em português."}
          />
        );
      })}
    </fieldset>
  );
}
