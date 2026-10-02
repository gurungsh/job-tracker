import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type { Requirement, RequirementKind, ValidRequirementInput } from "@job-tracker/shared";

type Row = Record<string, SQLOutputValue>;

const selectRequirements = "SELECT id, application_id, text, kind, met, created_at, updated_at FROM requirements";

/** Required first, then preferred, each in the order added (spec 009, AC-4). Undefined if the application doesn't exist. */
export function listRequirements(db: DatabaseSync, applicationId: number): Requirement[] | undefined {
  if (!applicationExists(db, applicationId)) return undefined;
  // "required" sorts after "preferred", so descending puts it first.
  return db
    .prepare(`${selectRequirements} WHERE application_id = ? ORDER BY kind DESC, id`)
    .all(applicationId)
    .map(toRequirement);
}

export function getRequirement(db: DatabaseSync, id: number): Requirement | undefined {
  const row = db.prepare(`${selectRequirements} WHERE id = ?`).get(id);
  return row ? toRequirement(row) : undefined;
}

/** Returns undefined if the application doesn't exist. */
export function createRequirement(
  db: DatabaseSync,
  applicationId: number,
  input: ValidRequirementInput,
  now: string,
): Requirement | undefined {
  if (!applicationExists(db, applicationId)) return undefined;
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO requirements (application_id, text, kind, met, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(applicationId, input.text, input.kind, input.met ? 1 : 0, now, now);
  return getRequirement(db, Number(lastInsertRowid));
}

/** Returns undefined if the requirement doesn't exist. */
export function updateRequirement(
  db: DatabaseSync,
  id: number,
  input: ValidRequirementInput,
  now: string,
): Requirement | undefined {
  const { changes } = db
    .prepare("UPDATE requirements SET text = ?, kind = ?, met = ?, updated_at = ? WHERE id = ?")
    .run(input.text, input.kind, input.met ? 1 : 0, now, id);
  return changes > 0 ? getRequirement(db, id) : undefined;
}

/** Returns false if the requirement doesn't exist. */
export function deleteRequirement(db: DatabaseSync, id: number): boolean {
  return db.prepare("DELETE FROM requirements WHERE id = ?").run(id).changes > 0;
}

function applicationExists(db: DatabaseSync, id: number): boolean {
  return db.prepare("SELECT 1 FROM applications WHERE id = ?").get(id) !== undefined;
}

function toRequirement(row: Row): Requirement {
  return {
    id: Number(row.id),
    applicationId: Number(row.application_id),
    text: String(row.text),
    kind: row.kind as RequirementKind,
    met: Number(row.met) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
