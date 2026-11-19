import { useId, type ReactNode } from "react";

/** Shared by every form control: a visible label, an optional hint and an error, all wired for assistive tech. */
export interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  /** Pass an id when an error summary must link to this field. */
  id?: string | undefined;
}

export interface FieldControlProps {
  id: string;
  required?: boolean;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

export function useFieldIds(id?: string) {
  const generated = useId();
  const base = id ?? generated;
  return { id: base, hintId: `${base}-hint`, errorId: `${base}-error` };
}

export function controlProps({ hint, error, required }: FieldProps, ids: ReturnType<typeof useFieldIds>): FieldControlProps {
  const describedBy = [hint && ids.hintId, error && ids.errorId].filter(Boolean).join(" ");
  return {
    id: ids.id,
    ...(required && { required }),
    ...(error && { "aria-invalid": true as const }),
    ...(describedBy && { "aria-describedby": describedBy }),
  };
}

export function FieldHint({ id, children }: { id: string; children?: ReactNode }) {
  return children ? (
    <span className="seuil-field__hint" id={id}>
      {children}
    </span>
  ) : null;
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  return children ? (
    <span className="seuil-field__error" id={id}>
      Erreur : {children}
    </span>
  ) : null;
}

export function RequiredMark({ required }: { required?: boolean | undefined }) {
  return required ? <span aria-hidden="true"> *</span> : null;
}
