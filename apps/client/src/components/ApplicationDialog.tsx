import type { Application, Company } from "@job-tracker/shared";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useDialogFocus } from "../lib/useDialogFocus.ts";
import { ApplicationForm } from "./ApplicationForm.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import "./ApplicationDialog.css";

type ApplicationDialogProps = {
  /** The application to edit. Leave it out to add a new one. */
  application?: Application;
  companies: Company[];
  onSaved: (saved: Application) => void;
  onClose: () => void;
};

/** The application form in a modal, for adding an application and for editing one (spec 013, AC-6, AC-13). */
export function ApplicationDialog({ application, companies, onSaved, onClose }: ApplicationDialogProps) {
  const titleId = useId();
  const focus = useDialogFocus<HTMLDivElement>();
  // A ref, not state, so closing reads whether the form changed at the moment of the key press or click,
  // even if the form has just been typed in and hasn't rendered again yet.
  const changed = useRef(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const setChanged = useCallback((value: boolean) => {
    changed.current = value;
  }, []);

  // Closing a changed form asks first, so edits aren't lost by accident (spec 002, AC-11).
  const requestClose = useCallback(() => {
    if (changed.current) setConfirmingDiscard(true);
    else onClose();
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  return (
    <>
      <div className="dialog-backdrop">
        <div className="application-dialog" {...focus} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <header className="application-dialog-header">
            <h2 id={titleId}>{application ? "Edit application" : "Add Application"}</h2>
            <button type="button" onClick={requestClose} aria-label="Close">
              ×
            </button>
          </header>
          <ApplicationForm
            application={application}
            companies={companies}
            onSaved={onSaved}
            onChangedChange={setChanged}
          />
        </div>
      </div>
      {confirmingDiscard && (
        <ConfirmDialog
          title="Discard changes?"
          message="You have unsaved changes. Discard them?"
          confirmLabel="Discard"
          onConfirm={onClose}
          onCancel={() => {
            setConfirmingDiscard(false);
          }}
        />
      )}
    </>
  );
}
