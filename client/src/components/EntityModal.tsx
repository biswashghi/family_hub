import { motion } from "framer-motion";
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { EntityFields, submitEntityForm } from "../features/entities/EntityFields";
import type { ModalState } from "../types";

export function EntityModal({
  modal,
  error,
  demo,
  today,
  onClose,
  onSubmit,
}: {
  modal: ModalState;
  error: string;
  demo: boolean;
  today?: string;
  onClose: () => void;
  onSubmit: (action: () => Promise<unknown>) => void;
}) {
  const title = `${modal.mode === "create" ? "Add" : "Edit"} ${modal.kind === "item" ? "item" : modal.kind}`;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initialControl = dialogRef.current?.querySelector<HTMLElement>(".entityForm input:not(:disabled), .entityForm select:not(:disabled), .entityForm textarea:not(:disabled)");
    (initialControl || dialogRef.current?.querySelector<HTMLElement>("button"))?.focus();
    return () => previousFocus?.focus();
  }, []);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const controls = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo) return;
    const form = new FormData(event.currentTarget);
    onSubmit(() => submitEntityForm(modal, form));
  }

  return (
    <motion.div className="modalBackdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div ref={dialogRef} className="entityModal" role="dialog" aria-modal="true" aria-labelledby="entity-modal-title" onKeyDown={handleDialogKeyDown} initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
        <div className="modalHeader">
          <h2 id="entity-modal-title">{title}</h2>
          <button className="iconAction" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>
        <form className="entityForm" onSubmit={submit}>
          <EntityFields modal={modal} today={today} />
          {error && <p className="formError" role="alert">{error}</p>}
          {demo && <p className="formError">Demo mode is read-only.</p>}
          <div className="modalActions">
            <button className="actionButton quiet" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="actionButton primary" type="submit" disabled={demo}>
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
