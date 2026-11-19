import type { InputHTMLAttributes } from "react";
import { controlProps, FieldError, FieldHint, RequiredMark, useFieldIds, type FieldProps } from "./Field.js";

export interface CheckboxProps extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "required" | "type"> {}

/** The whole label is clickable, and the box is at least 24 x 24 px (WCAG 2.5.8). */
export function Checkbox({ label, hint, error, required, id, ...props }: CheckboxProps) {
  const ids = useFieldIds(id);
  return (
    <div className="seuil-checkbox">
      <input type="checkbox" className="seuil-checkbox__input" {...props} {...controlProps({ label, hint, error, required }, ids)} />
      <div className="seuil-checkbox__text">
        <label className="seuil-checkbox__label" htmlFor={ids.id}>
          {label}
          <RequiredMark required={required} />
        </label>
        <FieldHint id={ids.hintId}>{hint}</FieldHint>
        <FieldError id={ids.errorId}>{error}</FieldError>
      </div>
    </div>
  );
}
