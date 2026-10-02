import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type { Activity, ActivityType, ValidActivityInput, ValidActivityUpdate } from "@job-tracker/shared";

type Row = Record<string, SQLOutputValue>;

const selectActivities = `
  SELECT id, application_id, type, occurred_on, text, created_at, updated_at
  FROM activities`;

/** Newest date first, and the last one added first within a date (spec 007, AC-3). Undefined if the application doesn't exist. */
export function listActivities(db: DatabaseSync, applicationId: number): Activity[] | undefined {
  if (!applicationExists(db, applicationId)) return undefined;
  return db
    .prepare(`${selectActivities} WHERE application_id = ? ORDER BY occurred_on DESC, id DESC`)
    .all(applicationId)
    .map(toActivity);
}

export function getActivity(db: DatabaseSync, id: number): Activity | undefined {
  const row = db.prepare(`${selectActivities} WHERE id = ?`).get(id);
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
): number {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO activities (application_id, type, occurred_on, text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(applicationId, type, occurredOn, text, now, now);
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
  return getActivity(db, insertActivity(db, applicationId, input.type, input.occurredOn, input.text, now));
}

/** Changes the date, text, and (when given) type of an entry. Returns undefined if it doesn't exist. */
export function updateActivity(db: DatabaseSync, id: number, input: ValidActivityUpdate, now: string): Activity | undefined {
  const { changes } = db
    .prepare("UPDATE activities SET type = COALESCE(?, type), occurred_on = ?, text = ?, updated_at = ? WHERE id = ?")
    .run(input.type ?? null, input.occurredOn, input.text, now, id);
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
    text: String(row.text),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
