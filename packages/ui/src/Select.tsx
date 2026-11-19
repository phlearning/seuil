import type { SelectHTMLAttributes } from "react";
import { controlProps, FieldError, FieldHint, RequiredMark, useFieldIds, type FieldProps } from "./Field.js";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends FieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "required"> {
  options: SelectOption[];
  /** Shown first with an empty value, so nothing is chosen on the user's behalf. */
  placeholder?: string;
}

/** A native select: keyboard, screen readers and mobile pickers work without extra code. */
export function Select({ label, hint, error, required, id, options, placeholder, ...props }: SelectProps) {
  const ids = useFieldIds(id);
  return (
    <div className="seuil-field">
      <label className="seuil-field__label" htmlFor={ids.id}>
        {label}
        <RequiredMark required={required} />
      </label>
      <FieldHint id={ids.hintId}>{hint}</FieldHint>
      <select className="seuil-field__input" {...props} {...controlProps({ label, hint, error, required }, ids)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={ids.errorId}>{error}</FieldError>
    </div>
  );
}
