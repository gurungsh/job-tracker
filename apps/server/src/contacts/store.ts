import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type { Contact, ValidContactInput } from "@job-tracker/shared";

type Row = Record<string, SQLOutputValue>;

const selectContacts = `
  SELECT c.id, c.company_id, c.name, c.role, c.email, c.phone, c.notes, c.created_at, c.updated_at,
         (SELECT COUNT(*) FROM activities a WHERE a.contact_id = c.id) AS entry_count
  FROM contacts c`;

/** By name, ignoring case (spec 008, AC-2). Undefined if the company doesn't exist. */
export function listContacts(db: DatabaseSync, companyId: number): Contact[] | undefined {
  if (!companyExists(db, companyId)) return undefined;
  return db
    .prepare(`${selectContacts} WHERE c.company_id = ? ORDER BY c.name COLLATE NOCASE, c.id`)
    .all(companyId)
    .map(toContact);
}

export function getContact(db: DatabaseSync, id: number): Contact | undefined {
  const row = db.prepare(`${selectContacts} WHERE c.id = ?`).get(id);
  return row ? toContact(row) : undefined;
}

/** Returns undefined if the company doesn't exist. */
export function createContact(db: DatabaseSync, companyId: number, input: ValidContactInput, now: string): Contact | undefined {
  if (!companyExists(db, companyId)) return undefined;
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO contacts (company_id, name, role, email, phone, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(companyId, input.name, input.role, input.email, input.phone, input.notes, now, now);
  return getContact(db, Number(lastInsertRowid));
}

/** Returns undefined if the contact doesn't exist. */
export function updateContact(db: DatabaseSync, id: number, input: ValidContactInput, now: string): Contact | undefined {
  const { changes } = db
    .prepare("UPDATE contacts SET name = ?, role = ?, email = ?, phone = ?, notes = ?, updated_at = ? WHERE id = ?")
    .run(input.name, input.role, input.email, input.phone, input.notes, now, id);
  return changes > 0 ? getContact(db, id) : undefined;
}

/** Entries that named the contact stay, and no longer name anyone (the table's ON DELETE SET NULL). Returns false if it doesn't exist. */
export function deleteContact(db: DatabaseSync, id: number): boolean {
  return db.prepare("DELETE FROM contacts WHERE id = ?").run(id).changes > 0;
}

/** Whether the contact works at the application's company (spec 008, AC-10). */
export function contactIsAtApplicationsCompany(db: DatabaseSync, contactId: number, applicationId: number): boolean {
  return (
    db
      .prepare(
        `SELECT 1 FROM contacts c JOIN applications a ON a.company_id = c.company_id
         WHERE c.id = ? AND a.id = ?`,
      )
      .get(contactId, applicationId) !== undefined
  );
}

function companyExists(db: DatabaseSync, id: number): boolean {
  return db.prepare("SELECT 1 FROM companies WHERE id = ?").get(id) !== undefined;
}

function toContact(row: Row): Contact {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    name: String(row.name),
    role: nullableText(row.role),
    email: nullableText(row.email),
    phone: nullableText(row.phone),
    notes: nullableText(row.notes),
    entryCount: Number(row.entry_count),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function nullableText(value: SQLOutputValue | undefined): string | null {
  return value == null ? null : String(value);
}
