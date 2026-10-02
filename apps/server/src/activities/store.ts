import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type { Activity, ActivityType, ValidActivityInput, ValidActivityUpdate } from "@job-tracker/shared";

type Row = Record<string, SQLOutputValue>;

const selectActivities = `
  SELECT a.id, a.application_id, a.type, a.occurred_on, a.occurred_time, a.text, a.contact_id, c.name AS contact_name,
         a.created_at, a.updated_at
  FROM activities a
  LEFT JOIN contacts c ON c.id = a.contact_id`;

/** Newest date first, then timed entries before untimed ones with the later time first, then the last one added first (spec 007, AC-3, spec 017, AC-11). Undefined if the application doesn't exist. */
export function listActivities(db: DatabaseSync, applicationId: number): Activity[] | undefined {
  if (!applicationExists(db, applicationId)) return undefined;
  return db
    .prepare(`${selectActivities} WHERE a.application_id = ? ORDER BY a.occurred_on DESC, a.occurred_time IS NULL, a.occurred_time DESC, a.id DESC`)
    .all(applicationId)
    .map(toActivity);
}

export function getActivity(db: DatabaseSync, id: number): Activity | undefined {
  const row = db.prepare(`${selectActivities} WHERE a.id = ?`).get(id);
  return row ? toActivity(row) : undefined;
}

/** Adds an entry of any type. Used for the automatic entries, inside the caller's transaction (spec 007, AC-6, AC-7). */
export function insertActivity(
  db: DatabaseSync,
  applicationId: number,
  type: ActivityType,
  occurredOn: string,
  text: string,
  now: string,
  contactId: number | null = null,
  occurredTime: string | null = null,
): number {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO activities (application_id, type, occurred_on, occurred_time, text, contact_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(applicationId, type, occurredOn, occurredTime, text, contactId, now, now);
  return Number(lastInsertRowid);
}

/** Returns undefined if the application doesn't exist. */
export function createActivity(
  db: DatabaseSync,
  applicationId: number,
  input: ValidActivityInput,
  now: string,
): Activity | undefined {
  if (!applicationExists(db, applicationId)) return undefined;
  return getActivity(db, insertActivity(db, applicationId, input.type, input.occurredOn, input.text, now, input.contactId, input.occurredTime));
}

/** Changes the date, time, text, contact, and (when given) type of an entry. Returns undefined if it doesn't exist. */
export function updateActivity(db: DatabaseSync, id: number, input: ValidActivityUpdate, now: string): Activity | undefined {
  const { changes } = db
    .prepare("UPDATE activities SET type = COALESCE(?, type), occurred_on = ?, occurred_time = ?, text = ?, contact_id = ?, updated_at = ? WHERE id = ?")
    .run(input.type ?? null, input.occurredOn, input.occurredTime, input.text, input.contactId, now, id);
  return changes > 0 ? getActivity(db, id) : undefined;
}

/** Returns false if the entry doesn't exist. */
export function deleteActivity(db: DatabaseSync, id: number): boolean {
  return db.prepare("DELETE FROM activities WHERE id = ?").run(id).changes > 0;
}

function applicationExists(db: DatabaseSync, id: number): boolean {
  return db.prepare("SELECT 1 FROM applications WHERE id = ?").get(id) !== undefined;
}

function toActivity(row: Row): Activity {
  return {
    id: Number(row.id),
    applicationId: Number(row.application_id),
    type: row.type as ActivityType,
    occurredOn: String(row.occurred_on),
    occurredTime: row.occurred_time == null ? null : String(row.occurred_time),
    text: String(row.text),
    contactId: row.contact_id == null ? null : Number(row.contact_id),
    contactName: row.contact_name == null ? null : String(row.contact_name),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
