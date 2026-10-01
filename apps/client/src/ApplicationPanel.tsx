import {
  type Application,
  type ApplicationInput,
  type Company,
  STAGE_LABELS,
  STAGES,
  type Stage,
  applicationInputSchema,
  fieldErrors,
} from "@job-tracker/shared";
import { type ReactNode, type SyntheticEvent, useCallback, useEffect, useId, useState } from "react";
import { ApiError, api } from "./api.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { daysInStage, formatDate, localDateOf, timeInStage } from "./dates.ts";

type ApplicationPanelProps = {
  /** The application to edit. Leave it out to add a new one. */
  application?: Application;
  companies: Company[];
  onSaved: () => void;
  onDeleted: () => void;
  onClose: () => void;
};

type FormValues = {
  companyName: string;
  jobTitle: string;
  stage: Stage;
  nextStep: string;
  nextStepDue: string;
  appliedOn: string;
};

function initialValues(application?: Application): FormValues {
  return {
    companyName: application?.companyName ?? "",
    jobTitle: application?.jobTitle ?? "",
    stage: application?.stage ?? "wishlist",
    nextStep: application?.nextStep ?? "",
    nextStepDue: application?.nextStepDue ?? "",
    appliedOn: application?.appliedOn ?? "",
  };
}

export function ApplicationPanel({ application, companies, onSaved, onDeleted, onClose }: ApplicationPanelProps) {
  const titleId = useId();
  const companiesListId = useId();
  const [values, setValues] = useState(() => initialValues(application));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const title = application ? "Edit application" : "Add application";

  const changed = JSON.stringify(values) !== JSON.stringify(initialValues(application));
  // Closing a changed form asks first, so edits aren't lost by accident (spec 002, AC-11).
  const requestClose = useCallback(() => {
    if (changed) setConfirmingDiscard(true);
    else onClose();
  }, [changed, onClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function save(event: SyntheticEvent) {
    event.preventDefault();
    const input: ApplicationInput = values;
    // Check the same rules the server does, so most mistakes are caught before sending (spec 002, AC-7, AC-20).
    const result = applicationInputSchema.safeParse(input);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      if (application) await api.updateApplication(application.id, input);
      else await api.createApplication(input);
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields);
      else setSaveError(`Couldn't save. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setConfirmingDelete(false);
    setSaveError(null);
    setSaving(true);
    try {
      await api.deleteApplication(id);
      onDeleted();
    } catch (error) {
      setSaveError(`Couldn't delete. ${error instanceof Error ? error.message : String(error)}`);
      setSaving(false);
    }
  }

  return (
    <aside className="panel" role="dialog" aria-labelledby={titleId}>
      <form className="panel-form" onSubmit={(event) => void save(event)} noValidate>
        <header className="panel-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={requestClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="panel-body">
          {application && <StageInfo application={application} />}
          <Field label="Company" error={errors.companyName}>
            {(props) => (
              <>
                <input
                  {...props}
                  list={companiesListId}
                  autoComplete="off"
                  value={values.companyName}
                  onChange={(event) => {
                    update("companyName", event.target.value);
                  }}
                />
                <datalist id={companiesListId}>
                  {companies.map((company) => (
                    <option key={company.id} value={company.name} />
                  ))}
                </datalist>
              </>
            )}
          </Field>

          <Field label="Job title" error={errors.jobTitle}>
            {(props) => (
              <input
                {...props}
                value={values.jobTitle}
                onChange={(event) => {
                  update("jobTitle", event.target.value);
                }}
              />
            )}
          </Field>

          <Field label="Stage" error={errors.stage}>
            {(props) => (
              <select
                {...props}
                value={values.stage}
                onChange={(event) => {
                  update("stage", event.target.value);
                }}
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Next step" error={errors.nextStep}>
            {(props) => (
              <textarea
                {...props}
                rows={2}
                value={values.nextStep}
                onChange={(event) => {
                  update("nextStep", event.target.value);
                }}
              />
            )}
          </Field>

          <Field label="Next step due date" error={errors.nextStepDue}>
            {(props) => (
              <input
                {...props}
                type="date"
                value={values.nextStepDue}
                onChange={(event) => {
                  update("nextStepDue", event.target.value);
                }}
              />
            )}
          </Field>

          <Field label="Applied date" error={errors.appliedOn}>
            {(props) => (
              <input
                {...props}
                type="date"
                value={values.appliedOn}
                onChange={(event) => {
                  update("appliedOn", event.target.value);
                }}
              />
            )}
          </Field>

          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
        </div>

        <footer className="panel-footer">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {application && (
            <button
              type="button"
              className="danger"
              disabled={saving}
              onClick={() => {
                setConfirmingDelete(true);
              }}
            >
              Delete
            </button>
          )}
        </footer>
      </form>
      {application && confirmingDelete && (
        <ConfirmDialog
          title="Delete application?"
          message={`Delete ${application.jobTitle} at ${application.companyName}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => void remove(application.id)}
          onCancel={() => {
            setConfirmingDelete(false);
          }}
        />
      )}
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
    </aside>
  );
}

/** How long the application has been in its stage, and its automatic dates (spec 002, AC-9, AC-22). */
function StageInfo({ application }: { application: Application }) {
  const days = daysInStage(application.stageChangedAt);
  return (
    <div className="stage-info">
      <strong>{timeInStage(STAGE_LABELS[application.stage], days)}</strong>
      <span>Stage changed {formatDate(localDateOf(application.stageChangedAt))}</span>
      {application.closedOn && <span>Closed {formatDate(application.closedOn)}</span>}
    </div>
  );
}

type FieldControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/** A labeled form control with its error message linked for screen readers. */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error: string | undefined;
  children: (props: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": error !== undefined, "aria-describedby": error ? errorId : undefined })}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
