import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button.js";

export interface FormError {
  /** id of the field, as passed to its `id` prop. */
  fieldId: string;
  message: string;
}

export interface FormProps {
  children: ReactNode;
  onSubmit: (data: FormData) => void;
  errors?: FormError[];
  submitLabel?: string;
}

/**
 * On a failed submit, an error summary appears above the form and takes focus,
 * with one link per error that moves focus to the field (WCAG 3.3.1, 3.3.3).
 * Browser validation is off so every user gets the same, readable messages.
 */
export function Form({ children, onSubmit, errors = [], submitLabel = "Envoyer" }: FormProps) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (errors.length > 0) summaryRef.current?.focus();
  }, [errors]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };

  return (
    <form className="seuil-form" noValidate onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="seuil-error-summary" ref={summaryRef} tabIndex={-1} aria-labelledby={titleId}>
          <h2 className="seuil-error-summary__title" id={titleId}>
            {errors.length === 1 ? "Le formulaire contient 1 erreur" : `Le formulaire contient ${errors.length} erreurs`}
          </h2>
          <ul>
            {errors.map((e) => (
              <li key={e.fieldId}>
                <a
                  href={`#${e.fieldId}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(e.fieldId)?.focus();
                  }}
                >
                  {e.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
      <div>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
