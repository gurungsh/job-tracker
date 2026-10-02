import { type Contact, contactInputSchema, fieldErrors } from "@job-tracker/shared";
import { type SyntheticEvent, useEffect, useId, useState } from "react";
import { ApiError, api } from "../lib/api.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import "./Contacts.css";

type ContactsProps = {
  companyId: number;
  companyName: string;
  /** Called after a contact is added, changed, or deleted, so a timeline that offers the contacts can reload (spec 013, AC-12). */
  onChange?: () => void;
};

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; contacts: Contact[] };

/** By name, ignoring case, as the server sends them (spec 008, AC-2). */
function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The people at an application's company, shared by every application there (spec 008). */
export function Contacts({ companyId, companyName, onChange }: ContactsProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [loadCount, setLoadCount] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
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

  if (state.status === "loading") return <p className="contacts-status">Loading…</p>;

  if (state.status === "error") {
    return (
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
      </div>
    );
  }

  return (
    <div className="contacts">
      <h3 className="contacts-heading">People at {companyName}</h3>
      <ContactForm
        heading="Add contact"
        submitLabel="Add contact"
        resetAfterSave
        onSubmit={async (input) => {
          const created = await api.createContact(companyId, input);
          changeContacts((contacts) => [...contacts, created]);
        }}
      />

      {actionError && (
        <p className="contacts-error" role="alert">
          {actionError}
        </p>
      )}

      {state.contacts.length === 0 ? (
        <p className="contacts-status">No contacts yet. Add the people you deal with at {companyName} above.</p>
      ) : (
        <ul className="contacts-list">
          {state.contacts.map((contact) => (
            <li key={contact.id} className="contact">
              {editingId === contact.id ? (
                <ContactForm
                  heading="Edit contact"
                  submitLabel="Save"
                  initial={contact}
                  onCancel={() => {
                    setEditingId(null);
                  }}
                  onSubmit={async (input) => {
                    const updated = await api.updateContact(contact.id, input);
                    changeContacts((contacts) => contacts.map((c) => (c.id === contact.id ? updated : c)));
                    setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <p className="contact-name">
                    <strong>{contact.name}</strong>
                    {contact.role && <span className="contact-role"> · {contact.role}</span>}
                  </p>
                  {contact.email && <p className="contact-line">{contact.email}</p>}
                  {contact.phone && <p className="contact-line">{contact.phone}</p>}
                  {contact.notes && <p className="contact-notes">{contact.notes}</p>}
                  <div className="contact-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setEditingId(contact.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleting(contact);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
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
    </div>
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
  /** Clear the form after a save, for adding several contacts in a row. */
  resetAfterSave?: boolean;
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
function ContactForm({ heading, submitLabel, initial, resetAfterSave = false, onCancel, onSubmit }: ContactFormProps) {
  const id = useId();
  const empty: ContactValues = { name: "", role: "", email: "", phone: "", notes: "" };
  const [values, setValues] = useState<ContactValues>(
    initial ? { name: initial.name, role: initial.role ?? "", email: initial.email ?? "", phone: initial.phone ?? "", notes: initial.notes ?? "" } : empty,
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
      if (resetAfterSave) setValues(empty);
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
