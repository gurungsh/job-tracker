import { type Contact, contactInputSchema, fieldErrors } from "@job-tracker/shared";
import { type ReactNode, type SyntheticEvent, useEffect, useId, useRef, useState } from "react";
import { ApiError, api } from "../lib/api.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { EntryActions } from "./EntryActions.tsx";
import { SectionCard } from "./SectionCard.tsx";
import "./Contacts.css";

type ContactsProps = {
  companyId: number;
  /** Called after a contact is added, changed, or deleted, so a timeline that offers the contacts can reload (spec 013, AC-12). */
  onChange?: () => void;
};

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; contacts: Contact[] };

/** By name, ignoring case, as the server sends them (spec 008, AC-2). */
function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The people at an application's company, shared by every application there (spec 008), in a card of its own (spec 016). */
export function Contacts({ companyId, onChange }: ContactsProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [loadCount, setLoadCount] = useState(0);
  // Several people can be edited at once, so opening one doesn't throw away what is typed in another (spec 016, edge cases).
  const [editingIds, setEditingIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const addToggle = useRef<HTMLButtonElement>(null);
  const wasAdding = useRef(false);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    api.listContacts(companyId).then(
      (contacts) => {
        if (current) setState({ status: "ready", contacts: sortContacts(contacts) });
      },
      (error: unknown) => {
        if (current) setState({ status: "error", message: errorText(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [companyId, loadCount]);

  // When the add form closes its "+ Add" button comes back, and takes focus, so keyboard use isn't lost (spec 016, AC-6).
  useEffect(() => {
    if (!adding && wasAdding.current) addToggle.current?.focus();
    wasAdding.current = adding;
  }, [adding]);

  function changeContacts(change: (contacts: Contact[]) => Contact[]) {
    setState((current) =>
      current.status === "ready" ? { status: "ready", contacts: sortContacts(change(current.contacts)) } : current,
    );
    onChange?.();
  }

  async function remove(contact: Contact) {
    setDeleting(null);
    setActionError(null);
    try {
      await api.deleteContact(contact.id);
      changeContacts((contacts) => contacts.filter((c) => c.id !== contact.id));
    } catch (error) {
      setActionError(`Couldn't delete ${contact.name}. ${errorText(error)}`);
    }
  }

  const card = (action: ReactNode, body: ReactNode) => (
    <SectionCard title="Contacts" action={action}>
      {body}
    </SectionCard>
  );

  if (state.status === "loading") return card(null, <p className="contacts-status">Loading…</p>);

  if (state.status === "error") {
    return card(
      null,
      <div className="contacts-status" role="alert">
        <p>Couldn't load the contacts. {state.message}</p>
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

  // "+ Add" is hidden while the form is open, so there is never a second button with the same name (spec 016, AC-6).
  const addButton = adding ? null : (
    <button
      ref={addToggle}
      type="button"
      className="text-button"
      aria-label="Add contact"
      onClick={() => {
        setAdding(true);
      }}
    >
      + Add
    </button>
  );

  return card(
    addButton,
    <div className="contacts">
      {adding && (
        <ContactForm
          heading="Add contact"
          submitLabel="Save"
          onCancel={() => {
            setAdding(false);
          }}
          onSubmit={async (input) => {
            const created = await api.createContact(companyId, input);
            changeContacts((contacts) => [...contacts, created]);
            setAdding(false);
          }}
        />
      )}

      {actionError && (
        <p className="contacts-error" role="alert">
          {actionError}
        </p>
      )}

      {state.contacts.length === 0 ? (
        <p className="contacts-status">Nobody recorded yet — add the recruiter or hiring manager you're talking to.</p>
      ) : (
        <ul className="contacts-list">
          {state.contacts.map((contact) => (
            <li key={contact.id} className="contact">
              {editingIds.includes(contact.id) ? (
                <ContactForm
                  heading="Edit contact"
                  submitLabel="Save"
                  initial={contact}
                  onCancel={() => {
                    stopEditing(contact.id);
                  }}
                  onSubmit={async (input) => {
                    const updated = await api.updateContact(contact.id, input);
                    changeContacts((contacts) => contacts.map((c) => (c.id === contact.id ? updated : c)));
                    stopEditing(contact.id);
                  }}
                />
              ) : (
                <div className="contact-row">
                  <div className="contact-info">
                    <p className="contact-name">{contact.name}</p>
                    {contact.role && <p className="contact-role">{contact.role}</p>}
                    {contact.email && (
                      <p className="contact-line">
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </p>
                    )}
                    {contact.phone && <p className="contact-line">{contact.phone}</p>}
                    {contact.notes && <p className="contact-notes">{contact.notes}</p>}
                  </div>
                  <EntryActions
                    what="contact"
                    text={contact.name}
                    onEdit={() => {
                      setActionError(null);
                      setEditingIds((ids) => [...ids, contact.id]);
                    }}
                    onDelete={() => {
                      setDeleting(contact);
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this contact?"
          message={deleteMessage(deleting)}
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

/** Says how many timeline entries mention the contact, when there are any (spec 008, AC-7). */
function deleteMessage({ name, entryCount }: Contact): string {
  if (entryCount === 0) return `${name} will be removed from this company's contacts.`;
  const mention = entryCount === 1 ? "1 timeline entry mentions" : `${String(entryCount)} timeline entries mention`;
  return `${name} will be removed from this company's contacts. ${mention} them. ${entryCount === 1 ? "It" : "They"} will stay, but no longer name anyone.`;
}

type ContactValues = { name: string; role: string; email: string; phone: string; notes: string };

type ContactFormProps = {
  heading: string;
  submitLabel: string;
  initial?: Contact;
  onCancel?: () => void;
  onSubmit: (input: ContactValues) => Promise<void>;
};

const FIELDS: { name: keyof ContactValues; label: string }[] = [
  { name: "name", label: "Name" },
  { name: "role", label: "Role" },
  { name: "email", label: "Email" },
  { name: "phone", label: "Phone" },
];

/** The form for adding a contact and for editing one. */
function ContactForm({ heading, submitLabel, initial, onCancel, onSubmit }: ContactFormProps) {
  const id = useId();
  const [values, setValues] = useState<ContactValues>(
    initial
      ? { name: initial.name, role: initial.role ?? "", email: initial.email ?? "", phone: initial.phone ?? "", notes: initial.notes ?? "" }
      : { name: "", role: "", email: "", phone: "", notes: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    // The same rules the server checks (spec 008, AC-4).
    const result = contactInputSchema.safeParse(values);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setErrors(error.fields);
      else setFormError(`Couldn't save the contact. ${errorText(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="contact-form" aria-label={heading} onSubmit={(event) => void submit(event)} noValidate>
      {FIELDS.map(({ name, label }) => (
        <div className="field" key={name}>
          <label htmlFor={`${id}-${name}`}>{label}</label>
          <input
            id={`${id}-${name}`}
            value={values[name]}
            aria-invalid={errors[name] ? true : undefined}
            autoComplete="off"
            autoFocus={name === "name"}
            onChange={(event) => {
              setValues({ ...values, [name]: event.target.value });
            }}
          />
          {errors[name] && <p className="field-error">{errors[name]}</p>}
        </div>
      ))}
      <div className="field">
        <label htmlFor={`${id}-notes`}>Notes</label>
        <textarea
          id={`${id}-notes`}
          rows={3}
          value={values.notes}
          aria-invalid={errors.notes ? true : undefined}
          onChange={(event) => {
            setValues({ ...values, notes: event.target.value });
          }}
        />
        {errors.notes && <p className="field-error">{errors.notes}</p>}
      </div>
      {formError && (
        <p className="contacts-error" role="alert">
          {formError}
        </p>
      )}
      <div className="contact-form-actions">
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
