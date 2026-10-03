import {
  REQUIREMENT_KINDS,
  REQUIREMENT_KIND_LABELS,
  type Requirement,
  type RequirementKind,
  fieldErrors,
  requirementInputSchema,
  requiredMetSummary,
} from "@job-tracker/shared";
import { type ReactNode, type SyntheticEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ApiError, api } from "../lib/api.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { EntryActions } from "./EntryActions.tsx";
import { SectionCard } from "./SectionCard.tsx";
import "./Requirements.css";

type RequirementsProps = {
  applicationId: number;
  /** True for an archived application: everything shows, and nothing can be changed until it is restored (spec 017, AC-6). */
  readOnly?: boolean;
};

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: Requirement[] };

/** Required first, then preferred, each in the order added, as the server sends them (spec 009, AC-4). */
function sortItems(items: Requirement[]): Requirement[] {
  return [...items].sort((a, b) => (a.kind === b.kind ? a.id - b.id : a.kind === "required" ? -1 : 1));
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A posting's requirements, with a checkbox for each one I meet (spec 009), in a card of its own (spec 016). */
export function Requirements({ applicationId, readOnly = false }: RequirementsProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [loadCount, setLoadCount] = useState(0);
  // Several rows can be edited at once, so opening one doesn't throw away what is typed in another (spec 016, edge cases).
  const [editingIds, setEditingIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const addToggle = useRef<HTMLButtonElement>(null);
  const wasAdding = useRef(false);
  const [deleting, setDeleting] = useState<Requirement | null>(null);
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  // The kind chosen for the last item added stays, for adding several of one kind in a row (spec 009, AC-3).
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

  // When the add form closes its "+ Add" button comes back, and takes focus, so keyboard use isn't lost (spec 016, AC-6).
  useEffect(() => {
    if (!adding && wasAdding.current) addToggle.current?.focus();
    wasAdding.current = adding;
  }, [adding]);

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

  const card = (action: ReactNode, body: ReactNode) => (
    <SectionCard title="Requirements" action={action}>
      {body}
    </SectionCard>
  );

  if (state.status === "loading") return card(null, <p className="requirements-status">Loading…</p>);

  if (state.status === "error") {
    return card(
      null,
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
      </div>,
    );
  }

  const summary = requiredMetSummary(state.items);
  const stopEditing = (id: number) => {
    setEditingIds((ids) => ids.filter((editing) => editing !== id));
  };

  // "+ Add" is hidden while the form is open, so there is never a second button with the same name (spec 016, AC-6).
  const addButton = adding || readOnly ? null : (
    <button
      ref={addToggle}
      type="button"
      className="text-button"
      aria-label="Add requirement"
      onClick={() => {
        setAdding(true);
      }}
    >
      + Add
    </button>
  );

  return card(
    addButton,
    <div className="requirements">
      {summary && <p className="requirements-summary">{summary}</p>}

      {adding && !readOnly && (
        <RequirementForm
          heading="Add requirement"
          submitLabel="Save"
          kind={newKind}
          onKindChange={setNewKind}
          onCancel={() => {
            setAdding(false);
          }}
          onSubmit={async (input) => {
            const created = await api.createRequirement(applicationId, input);
            changeItems((items) => [...items, created]);
            setAdding(false);
          }}
        />
      )}

      {actionError && (
        <p className="requirements-error" role="alert">
          {actionError}
        </p>
      )}

      {state.items.length === 0 ? (
        <p className="requirements-status">
          {readOnly ? "No requirements." : "No requirements yet. Use + Add to list the items from the posting."}
        </p>
      ) : (
        <ul className="requirements-list">
          {state.items.map((item) => (
            <li key={item.id} className="requirement">
              {!readOnly && editingIds.includes(item.id) ? (
                <RequirementForm
                  heading="Edit requirement"
                  submitLabel="Save"
                  initial={item}
                  onCancel={() => {
                    stopEditing(item.id);
                  }}
                  onSubmit={async (input) => {
                    const updated = await api.updateRequirement(item.id, { ...input, met: item.met });
                    changeItems((items) => items.map((i) => (i.id === item.id ? updated : i)));
                    stopEditing(item.id);
                  }}
                />
              ) : (
                <div className="requirement-row">
                  <label className="requirement-check">
                    <input
                      type="checkbox"
                      checked={item.met}
                      disabled={readOnly || savingIds.includes(item.id)}
                      onChange={() => void toggle(item)}
                    />
                    <span className="requirement-text">{item.text}</span>
                  </label>
                  {/* Outside the label, so the checkbox keeps the requirement's own text as its name. */}
                  {item.kind === "preferred" && <span className="pill">Nice to have</span>}
                  {!readOnly && (
                    <EntryActions
                      what="requirement"
                      text={item.text}
                      onEdit={() => {
                        setActionError(null);
                        setEditingIds((ids) => [...ids, item.id]);
                      }}
                      onDelete={() => {
                        setDeleting(item);
                      }}
                    />
                  )}
                </div>
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
    </div>,
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
  onCancel?: () => void;
  onSubmit: (input: { text: string; kind: RequirementKind }) => Promise<void>;
};

/** The form for adding a requirement and for editing one. */
function RequirementForm({ heading, submitLabel, initial, kind, onKindChange, onCancel, onSubmit }: RequirementFormProps) {
  const id = useId();
  const [text, setText] = useState(initial?.text ?? "");
  const [ownKind, setOwnKind] = useState<RequirementKind>(initial?.kind ?? "required");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentKind = kind ?? ownKind;
  // The text box is one line tall until the text needs more, and grows to fit it in every browser (spec 016, AC-6).
  const textBox = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const box = textBox.current;
    if (!box) return;
    box.style.height = "auto";
    if (box.scrollHeight > 0) box.style.height = `${String(box.scrollHeight + box.offsetHeight - box.clientHeight)}px`;
  }, [text]);

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
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields);
      else setFormError(`Couldn't save the requirement. ${errorText(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="requirement-form" aria-label={heading} onSubmit={(event) => void submit(event)} noValidate>
      {/* The text and the kind sit on one line with no visible labels. They keep their names for screen readers (spec 016, AC-6). */}
      <div className="requirement-fields">
        <textarea
          ref={textBox}
          id={`${id}-text`}
          aria-label="Text"
          placeholder="Requirement"
          rows={1}
          autoFocus
          value={text}
          aria-invalid={errors.text ? true : undefined}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            // One line tall, like a text field: Enter saves, and Shift+Enter makes a new line.
            if (event.key === "Enter" && !event.shiftKey) void submit(event);
          }}
        />
        <select
          id={`${id}-kind`}
          aria-label="Kind"
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
      </div>
      {errors.text && <p className="field-error">{errors.text}</p>}
      {errors.kind && <p className="field-error">{errors.kind}</p>}
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
