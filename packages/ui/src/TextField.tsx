import { useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
}

/**
 * A visible label is mandatory (WCAG 1.3.1, 3.3.2). The hint and the error are
 * linked with aria-describedby, and the error is announced through aria-invalid
 * and text, never color alone (1.4.1, 3.3.1).
 */
export function TextField({ label, hint, error, required, ...props }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="seuil-field">
      <label className="seuil-field__label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {hint && (
        <span className="seuil-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      <input
        className="seuil-field__input"
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error && (
        <span className="seuil-field__error" id={errorId}>
          Erreur : {error}
        </span>
      )}
    </div>
  );
}
