import {
  ACTIVITY_TYPE_LABELS,
  type Activity,
  LOGGED_ACTIVITY_TYPES,
  activityInputSchema,
  activityUpdateSchema,
  fieldErrors,
} from "@job-tracker/shared";
import { type SyntheticEvent, useEffect, useId, useState } from "react";
import { ApiError, api } from "../lib/api.ts";
import { formatDate, localToday } from "../lib/dates.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import "./Timeline.css";

type TimelineProps = { applicationId: number };

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; entries: Activity[] };

/** The server's timeline order: newest date first, then the last one added (spec 007, AC-3). */
function sortEntries(entries: Activity[]): Activity[] {
  return [...entries].sort((a, b) => (a.occurredOn === b.occurredOn ? b.id - a.id : a.occurredOn < b.occurredOn ? 1 : -1));
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** An application's history: entries I log, and the stage changes the server records (spec 007). */
export function Timeline({ applicationId }: TimelineProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [loadCount, setLoadCount] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    api.listActivities(applicationId).then(
      (entries) => {
        if (current) setState({ status: "ready", entries: sortEntries(entries) });
      },
      (error: unknown) => {
        if (current) setState({ status: "error", message: errorText(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [applicationId, loadCount]);

  function changeEntries(change: (entries: Activity[]) => Activity[]) {
    setState((current) => (current.status === "ready" ? { status: "ready", entries: sortEntries(change(current.entries)) } : current));
  }

  async function remove(entry: Activity) {
    setDeleting(null);
    setActionError(null);
    try {
      await api.deleteActivity(entry.id);
      changeEntries((entries) => entries.filter((e) => e.id !== entry.id));
    } catch (error) {
      setActionError(`Couldn't delete the entry. ${errorText(error)}`);
    }
  }

  if (state.status === "loading") return <p className="timeline-status">Loading…</p>;

  if (state.status === "error") {
    return (
      <div className="timeline-status" role="alert">
        <p>Couldn't load the timeline. {state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ status: "loading" });
            setLoadCount((count) => count + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="timeline">
      <EntryForm
        heading="Add entry"
        submitLabel="Add entry"
        initial={{ type: "note", occurredOn: localToday(), text: "" }}
        resetAfterSave
        onSubmit={async (input) => {
          // The add form always offers one of the loggable types.
          if (input.type === undefined || input.type === "stage_change") return;
          const created = await api.createActivity(applicationId, { ...input, type: input.type });
          changeEntries((entries) => [...entries, created]);
        }}
      />

      {actionError && (
        <p className="timeline-error" role="alert">
          {actionError}
        </p>
      )}

      {state.entries.length === 0 ? (
        <p className="timeline-status">No entries yet. Log a note, email, call, or interview above.</p>
      ) : (
        <ol className="timeline-list">
          {state.entries.map((entry) => (
            <li key={entry.id} className="timeline-entry">
              {editingId === entry.id ? (
                <EntryForm
                  heading="Edit entry"
                  submitLabel="Save"
                  initial={{ type: entry.type, occurredOn: entry.occurredOn, text: entry.text }}
                  onCancel={() => {
                    setEditingId(null);
                  }}
                  onSubmit={async (input) => {
                    const updated = await api.updateActivity(entry.id, input);
                    changeEntries((entries) => entries.map((e) => (e.id === entry.id ? updated : e)));
                    setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <div className="timeline-entry-head">
                    <span className="timeline-type">{ACTIVITY_TYPE_LABELS[entry.type]}</span>
                    <time dateTime={entry.occurredOn}>{formatDate(entry.occurredOn)}</time>
                  </div>
                  <p className="timeline-text">{entry.text}</p>
                  <div className="timeline-entry-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setEditingId(entry.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleting(entry);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this entry?"
          message={`"${deleting.text.length > 80 ? `${deleting.text.slice(0, 80)}…` : deleting.text}" will be removed from the timeline.`}
          confirmLabel="Delete"
          onConfirm={() => {
            void remove(deleting);
          }}
          onCancel={() => {
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

type EntryValues = { type: Activity["type"]; occurredOn: string; text: string };

type EntryFormProps = {
  heading: string;
  submitLabel: string;
  initial: EntryValues;
  /** Clear the text and go back to today after a save, for adding several entries in a row. */
  resetAfterSave?: boolean;
  onCancel?: () => void;
  onSubmit: (input: { type?: Activity["type"]; occurredOn: string; text: string }) => Promise<void>;
};

/** The form for adding an entry and for editing one. Stage-change entries keep their type, so it isn't offered (AC-8). */
function EntryForm({ heading, submitLabel, initial, resetAfterSave = false, onCancel, onSubmit }: EntryFormProps) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const keepsType = initial.type === "stage_change";

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    // The same rules the server checks (spec 007, AC-4).
    const result = keepsType
      ? activityUpdateSchema.safeParse({ occurredOn: values.occurredOn, text: values.text })
      : activityInputSchema.safeParse(values);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await onSubmit(result.data);
      if (resetAfterSave) setValues({ ...initial, type: values.type, occurredOn: localToday() });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields);
      else setFormError(`Couldn't save the entry. ${errorText(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entry-form" aria-label={heading} onSubmit={(event) => void submit(event)} noValidate>
      {!keepsType && (
        <div className="field">
          <label htmlFor={`${id}-type`}>Type</label>
          <select
            id={`${id}-type`}
            value={values.type}
            onChange={(event) => {
              setValues({ ...values, type: event.target.value as Activity["type"] });
            }}
          >
            {LOGGED_ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACTIVITY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {errors.type && <p className="field-error">{errors.type}</p>}
        </div>
      )}
      <div className="field">
        <label htmlFor={`${id}-date`}>Date</label>
        <input
          id={`${id}-date`}
          type="date"
          value={values.occurredOn}
          aria-invalid={errors.occurredOn ? true : undefined}
          onChange={(event) => {
            setValues({ ...values, occurredOn: event.target.value });
          }}
        />
        {errors.occurredOn && <p className="field-error">{errors.occurredOn}</p>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-text`}>Text</label>
        <textarea
          id={`${id}-text`}
          rows={3}
          value={values.text}
          aria-invalid={errors.text ? true : undefined}
          onChange={(event) => {
            setValues({ ...values, text: event.target.value });
          }}
        />
        {errors.text && <p className="field-error">{errors.text}</p>}
      </div>
      {formError && (
        <p className="timeline-error" role="alert">
          {formError}
        </p>
      )}
      <div className="entry-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="primary" disabled={saving}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
