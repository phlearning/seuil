import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button.js";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Extra buttons placed before "Fermer". */
  actions?: ReactNode;
}

/**
 * Built on the native <dialog> opened with showModal(): the rest of the page
 * becomes inert, Escape closes it, and the browser returns focus to the
 * element that opened it. No focus-trap script, so no keyboard trap (2.1.2).
 */
export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="seuil-modal" aria-labelledby={titleId} onClose={onClose}>
      <h2 className="seuil-modal__title" id={titleId}>
        {title}
      </h2>
      <div>{children}</div>
      <div className="seuil-modal__actions">
        {actions}
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </dialog>
  );
}
