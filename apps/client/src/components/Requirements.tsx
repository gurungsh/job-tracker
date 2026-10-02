import {
  REQUIREMENT_KINDS,
  REQUIREMENT_KIND_LABELS,
  type Requirement,
  type RequirementKind,
  fieldErrors,
  requirementInputSchema,
  requirementsSummary,
} from "@job-tracker/shared";
import { type SyntheticEvent, useEffect, useId, useState } from "react";
import { ApiError, api } from "../lib/api.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import "./Requirements.css";

type RequirementsProps = { applicationId: number };

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: Requirement[] };

/** Required first, then preferred, each in the order added, as the server sends them (spec 009, AC-4). */
function sortItems(items: Requirement[]): Requirement[] {
  return [...items].sort((a, b) => (a.kind === b.kind ? a.id - b.id : a.kind === "required" ? -1 : 1));
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A posting's requirements, with a checkbox for each one I meet (spec 009). */
export function Requirements({ applicationId }: RequirementsProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [loadCount, setLoadCount] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Requirement | null>(null);
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  // The kind chosen for the last item added stays, for adding several of one kind in a row (AC-3).
  const [newKind, setNewKind] = useState<RequirementKind>("required");

  useEffect(() => {
    let current = true;
    api.listRequirements(applicationId).then(
      (items) => {
        if (current) setState({ status: "ready", items: sortItems(items) });
      },
      (error: unknown) => {
        if (current) setState({ status: "error", message: errorText(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [applicationId, loadCount]);

  function changeItems(change: (items: Requirement[]) => Requirement[]) {
    setState((current) => (current.status === "ready" ? { status: "ready", items: sortItems(change(current.items)) } : current));
  }

  async function toggle(item: Requirement) {
    setActionError(null);
    setSavingIds((ids) => [...ids, item.id]);
    try {
      const saved = await api.updateRequirement(item.id, { text: item.text, kind: item.kind, met: !item.met });
      changeItems((items) => items.map((i) => (i.id === item.id ? saved : i)));
    } catch (error) {
      setActionError(`Couldn't update "${item.text}". ${errorText(error)}`);
    } finally {
      setSavingIds((ids) => ids.filter((id) => id !== item.id));
    }
  }

  async function remove(item: Requirement) {
    setDeleting(null);
    setActionError(null);
    try {
      await api.deleteRequirement(item.id);
      changeItems((items) => items.filter((i) => i.id !== item.id));
    } catch (error) {
      setActionError(`Couldn't delete the requirement. ${errorText(error)}`);
    }
  }

  if (state.status === "loading") return <p className="requirements-status">Loading…</p>;

  if (state.status === "error") {
    return (
      <div className="requirements-status" role="alert">
        <p>Couldn't load the requirements. {state.message}</p>
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

  const summary = requirementsSummary(state.items);

  return (
    <div className="requirements">
      {summary && <p className="requirements-summary">{summary}</p>}

      <RequirementForm
        heading="Add requirement"
        submitLabel="Add requirement"
        kind={newKind}
        onKindChange={setNewKind}
        resetAfterSave
        onSubmit={async (input) => {
          const created = await api.createRequirement(applicationId, input);
          changeItems((items) => [...items, created]);
        }}
      />

      {actionError && (
        <p className="requirements-error" role="alert">
          {actionError}
        </p>
      )}

      {state.items.length === 0 ? (
        <p className="requirements-status">No requirements yet. Add the items from the posting above.</p>
      ) : (
        <ul className="requirements-list">
          {state.items.map((item) => (
            <li key={item.id} className="requirement">
              {editingId === item.id ? (
                <RequirementForm
                  heading="Edit requirement"
                  submitLabel="Save"
                  initial={item}
                  onCancel={() => {
                    setEditingId(null);
                  }}
                  onSubmit={async (input) => {
                    const updated = await api.updateRequirement(item.id, { ...input, met: item.met });
                    changeItems((items) => items.map((i) => (i.id === item.id ? updated : i)));
                    setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <label className="requirement-check">
                    <input
                      type="checkbox"
                      checked={item.met}
                      disabled={savingIds.includes(item.id)}
                      onChange={() => void toggle(item)}
                    />
                    <span className="requirement-text">{item.text}</span>
                  </label>
                  <div className="requirement-meta">
                    <span className="requirement-kind">{REQUIREMENT_KIND_LABELS[item.kind]}</span>
                    <span className="requirement-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setEditingId(item.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleting(item);
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this requirement?"
          message={`"${deleting.text.length > 80 ? `${deleting.text.slice(0, 80)}…` : deleting.text}" will be removed from the list.`}
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

type RequirementFormProps = {
  heading: string;
  submitLabel: string;
  /** When editing, the item being changed. */
  initial?: Requirement;
  /** When adding, the kind to offer, kept by the parent between additions. */
  kind?: RequirementKind;
  onKindChange?: (kind: RequirementKind) => void;
  /** Clear the text after a save, for adding several items in a row. */
  resetAfterSave?: boolean;
  onCancel?: () => void;
  onSubmit: (input: { text: string; kind: RequirementKind }) => Promise<void>;
};

/** The form for adding a requirement and for editing one. */
function RequirementForm({ heading, submitLabel, initial, kind, onKindChange, resetAfterSave = false, onCancel, onSubmit }: RequirementFormProps) {
  const id = useId();
  const [text, setText] = useState(initial?.text ?? "");
  const [ownKind, setOwnKind] = useState<RequirementKind>(initial?.kind ?? "required");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentKind = kind ?? ownKind;

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    // The same rules the server checks (spec 009, AC-9).
    const result = requirementInputSchema.safeParse({ text, kind: currentKind });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await onSubmit({ text: result.data.text, kind: result.data.kind });
      if (resetAfterSave) setText("");
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields);
      else setFormError(`Couldn't save the requirement. ${errorText(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="requirement-form" aria-label={heading} onSubmit={(event) => void submit(event)} noValidate>
      <div className="field">
        <label htmlFor={`${id}-text`}>Text</label>
        <textarea
          id={`${id}-text`}
          rows={2}
          value={text}
          aria-invalid={errors.text ? true : undefined}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        {errors.text && <p className="field-error">{errors.text}</p>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-kind`}>Kind</label>
        <select
          id={`${id}-kind`}
          value={currentKind}
          onChange={(event) => {
            const next = event.target.value as RequirementKind;
            setOwnKind(next);
            onKindChange?.(next);
          }}
        >
          {REQUIREMENT_KINDS.map((option) => (
            <option key={option} value={option}>
              {REQUIREMENT_KIND_LABELS[option]}
            </option>
          ))}
        </select>
        {errors.kind && <p className="field-error">{errors.kind}</p>}
      </div>
      {formError && (
        <p className="requirements-error" role="alert">
          {formError}
        </p>
      )}
      <div className="requirement-form-actions">
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
