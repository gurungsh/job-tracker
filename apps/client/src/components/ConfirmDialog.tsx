import { useEffect, useId } from "react";
import { useDialogFocus } from "../lib/useDialogFocus.ts";
import "./ConfirmDialog.css";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A modal yes-or-no question. Focus starts on Cancel and stays inside, and Escape cancels. */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  // Focus starts on Cancel, the first control, and Tab stays inside (spec 013, AC-16).
  const focus = useDialogFocus<HTMLDivElement>();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Keep the panel underneath from treating this Escape as its own.
      event.stopImmediatePropagation();
      onCancel();
    }
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [onCancel]);

  return (
    <div className="dialog-backdrop">
      <div className="dialog" {...focus} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
        <h2 id={titleId}>{title}</h2>
        <p id={messageId}>{message}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
