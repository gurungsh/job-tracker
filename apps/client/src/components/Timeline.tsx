import {
  ACTIVITY_TYPE_LABELS,
  type Activity,
  type Contact,
  LOGGED_ACTIVITY_TYPES,
  activityInputSchema,
  activityUpdateSchema,
  compareActivities,
  fieldErrors,
} from "@job-tracker/shared";
import { type ReactNode, type SyntheticEvent, useEffect, useId, useState } from "react";
import { ApiError, api } from "../lib/api.ts";
import { ACTIVITY_ICONS } from "../lib/activityIcons.ts";
import { formatDate, formatTime, localToday } from "../lib/dates.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { EntryActions } from "./EntryActions.tsx";
import { SectionCard } from "./SectionCard.tsx";
import "./Timeline.css";

type TimelineProps = {
  applicationId: number;
  companyId: number;
  /** Changing this loads the entries and contacts again without clearing what's typed in the form (spec 013, AC-5, AC-12). */
  reloadKey?: number;
  /** True for an archived application: the entries show, and none can be added, changed, or deleted (spec 017, AC-6). */
  readOnly?: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: Activity[]; contacts: Contact[] };

/** The server's timeline order: newest date first, timed before untimed, then the last one added (spec 007, AC-3, spec 017, AC-11). */
function sortEntries(entries: Activity[]): Activity[] {
  return [...entries].sort(compareActivities);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** An application's history, in a card of its own: entries I log, and the stage changes the server records (specs 007 and 016). */
export function Timeline({ applicationId, companyId, reloadKey, readOnly = false }: TimelineProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [loadCount, setLoadCount] = useState(0);
  // Several entries can be edited at once, so opening one doesn't throw away what is typed in another (spec 016, edge cases).
  const [editingIds, setEditingIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    // The company's contacts are loaded each time the tab opens, so the choices are current (spec 008, AC-8).
    Promise.all([api.listActivities(applicationId), api.listContacts(companyId)]).then(
      ([entries, contacts]) => {
        if (current) setState({ status: "ready", entries: sortEntries(entries), contacts });
      },
      (error: unknown) => {
        // A reload that fails keeps what is showing, so a half-typed entry isn't lost to an error message.
        if (current) setState((shown) => (shown.status === "ready" ? shown : { status: "error", message: errorText(error) }));
      },
    );
    return () => {
      current = false;
    };
  }, [applicationId, companyId, loadCount, reloadKey]);

  function changeEntries(change: (entries: Activity[]) => Activity[]) {
    setState((current) =>
      current.status === "ready" ? { ...current, entries: sortEntries(change(current.entries)) } : current,
    );
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

  const card = (body: ReactNode) => <SectionCard title="Timeline">{body}</SectionCard>;

  if (state.status === "loading") return card(<p className="timeline-status">Loading…</p>);

  if (state.status === "error") {
    return card(
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
      </div>,
    );
  }

  const stopEditing = (id: number) => {
    setEditingIds((ids) => ids.filter((editing) => editing !== id));
  };

  return card(
    <div className="timeline">
      {!readOnly && (
        <EntryForm
          heading="Add entry"
          submitLabel="Log entry"
          namesType
          initial={{ type: "note", occurredOn: localToday(), occurredTime: "", text: "", contactId: null }}
          contacts={state.contacts}
          resetAfterSave
          onSubmit={async (input) => {
            // The add form always offers one of the loggable types.
            if (input.type === undefined || input.type === "stage_change") return;
            const created = await api.createActivity(applicationId, { ...input, type: input.type });
            changeEntries((entries) => [...entries, created]);
          }}
        />
      )}

      {actionError && (
        <p className="timeline-error" role="alert">
          {actionError}
        </p>
      )}

      {state.entries.length === 0 ? (
        <p className="timeline-status">
          {readOnly ? "No entries." : "No entries yet. Log a note, email, call, or interview above."}
        </p>
      ) : (
        <ol className="timeline-list">
          {state.entries.map((entry) => (
            <li key={entry.id} className="timeline-entry">
              {!readOnly && editingIds.includes(entry.id) ? (
                <EntryForm
                  heading="Edit entry"
                  submitLabel="Save"
                  initial={{
                    type: entry.type,
                    occurredOn: entry.occurredOn,
                    occurredTime: entry.occurredTime ?? "",
                    text: entry.text,
                    contactId: entry.contactId,
                  }}
                  contacts={state.contacts}
                  onCancel={() => {
                    stopEditing(entry.id);
                  }}
                  onSubmit={async (input) => {
                    const updated = await api.updateActivity(entry.id, input);
                    changeEntries((entries) => entries.map((e) => (e.id === entry.id ? updated : e)));
                    stopEditing(entry.id);
                  }}
                />
              ) : (
                <EntryRow
                  entry={entry}
                  readOnly={readOnly}
                  onEdit={() => {
                    setActionError(null);
                    setEditingIds((ids) => [...ids, entry.id]);
                  }}
                  onDelete={() => {
                    setDeleting(entry);
                  }}
                />
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
    </div>,
  );
}

/** One entry: a round mark for its type on the timeline's line, its text, a muted date line, and Edit and ✕ (spec 016, AC-4, AC-8). */
function EntryRow({
  entry,
  readOnly,
  onEdit,
  onDelete,
}: {
  entry: Activity;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = ACTIVITY_ICONS[entry.type];
  return (
    <div className="timeline-row">
      <span className="timeline-mark">
        <Icon size={16} aria-hidden="true" />
        <span className="visually-hidden">{ACTIVITY_TYPE_LABELS[entry.type]}</span>
      </span>
      <div className="timeline-body">
        <p className="timeline-text">{entry.text}</p>
        <p className="timeline-meta">
          <time dateTime={entry.occurredOn}>{formatDate(entry.occurredOn)}</time>
          {entry.occurredTime && (
            <>
              <span aria-hidden="true"> · </span>
              <time dateTime={entry.occurredTime}>{formatTime(entry.occurredTime)}</time>
            </>
          )}
          {entry.contactName && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="timeline-contact">with {entry.contactName}</span>
            </>
          )}
        </p>
      </div>
      {!readOnly && <EntryActions what="entry" text={entry.text} onEdit={onEdit} onDelete={onDelete} />}
    </div>
  );
}

/** What the form holds. The time is as typed, so an empty string means none (spec 017, AC-9). */
type EntryValues = {
  type: Activity["type"];
  occurredOn: string;
  occurredTime: string;
  text: string;
  contactId: number | null;
};

type EntryFormProps = {
  heading: string;
  submitLabel: string;
  initial: EntryValues;
  /** The company's contacts, for the Contact choice. */
  contacts: Contact[];
  /** The add form's button is named for the chosen type, such as "Log note" (spec 016, AC-7). */
  namesType?: boolean;
  /** Clear the text and go back to today after a save, for adding several entries in a row. */
  resetAfterSave?: boolean;
  onCancel?: () => void;
  onSubmit: (input: {
    type?: Activity["type"];
    occurredOn: string;
    occurredTime: string | null;
    text: string;
    contactId: number | null;
  }) => Promise<void>;
};

/** The form for adding an entry and for editing one. Stage-change entries keep their type, so it isn't offered (AC-8). */
function EntryForm({ heading, submitLabel, initial, contacts, namesType = false, resetAfterSave = false, onCancel, onSubmit }: EntryFormProps) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const keepsType = initial.type === "stage_change";
  const buttonLabel = namesType ? `Log ${ACTIVITY_TYPE_LABELS[values.type].toLowerCase()}` : submitLabel;

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    // The same rules the server checks (spec 007, AC-4).
    const result = keepsType
      ? activityUpdateSchema.safeParse({
          occurredOn: values.occurredOn,
          occurredTime: values.occurredTime,
          text: values.text,
          contactId: values.contactId,
        })
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
      <div className="entry-fields">
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
        <label htmlFor={`${id}-contact`}>With</label>
        <select
          id={`${id}-contact`}
          value={values.contactId === null ? "" : String(values.contactId)}
          onChange={(event) => {
            setValues({ ...values, contactId: event.target.value === "" ? null : Number(event.target.value) });
          }}
        >
          <option value="">None</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
        {errors.contactId && <p className="field-error">{errors.contactId}</p>}
      </div>
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
        <label htmlFor={`${id}-time`}>Time</label>
        <input
          id={`${id}-time`}
          type="time"
          value={values.occurredTime}
          aria-invalid={errors.occurredTime ? true : undefined}
          onChange={(event) => {
            setValues({ ...values, occurredTime: event.target.value });
          }}
        />
        {errors.occurredTime && <p className="field-error">{errors.occurredTime}</p>}
      </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-text`}>What happened</label>
        <textarea
          id={`${id}-text`}
          rows={3}
          placeholder="Anything worth remembering…"
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
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}
