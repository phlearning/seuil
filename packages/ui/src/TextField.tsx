import type { InputHTMLAttributes } from "react";
import { controlProps, FieldError, FieldHint, RequiredMark, useFieldIds, type FieldProps } from "./Field.js";

export interface TextFieldProps extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "required"> {}

/**
 * A visible label is mandatory (WCAG 1.3.1, 3.3.2). The hint and the error are
 * linked with aria-describedby, and the error is announced through aria-invalid
 * and text, never color alone (1.4.1, 3.3.1).
 */
export function TextField({ label, hint, error, required, id, ...props }: TextFieldProps) {
  const ids = useFieldIds(id);
  return (
    <div className="seuil-field">
      <label className="seuil-field__label" htmlFor={ids.id}>
        {label}
        <RequiredMark required={required} />
      </label>
      <FieldHint id={ids.hintId}>{hint}</FieldHint>
      <input className="seuil-field__input" {...props} {...controlProps({ label, hint, error, required }, ids)} />
      <FieldError id={ids.errorId}>{error}</FieldError>
    </div>
  );
}
