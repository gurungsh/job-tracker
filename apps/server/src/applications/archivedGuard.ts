import type { DatabaseSync } from "node:sqlite";
import type { ErrorResponse } from "@job-tracker/shared";
import type { RequestHandler } from "express";

/** The application a write would change, from its path, or undefined for a write that isn't to an application's own data. */
function owningApplicationId(db: DatabaseSync, method: string, path: string): number | undefined {
  const forApplication = (/^\/applications\/(\d+)(?:\/(?:activities|requirements))?$/.exec(path)?.[1]);
  if (forApplication !== undefined) {
    // Only PUT changes the application itself. POST /archive and /restore, and DELETE, are left alone, and a POST to a
    // list adds an entry or a requirement to it.
    return method === "PUT" || (method === "POST" && /\/(activities|requirements)$/.test(path)) ? Number(forApplication) : undefined;
  }
  if (method !== "PUT" && method !== "DELETE") return undefined;
  const entry = /^\/(activities|requirements)\/(\d+)$/.exec(path);
  if (!entry) return undefined;
  const row = db.prepare(`SELECT application_id FROM ${entry[1] as string} WHERE id = ?`).get(Number(entry[2]));
  return row ? Number(row.application_id) : undefined;
}

/**
 * An archived application can be read, restored, or deleted, and nothing else until it is restored, so a stale page or a
 * script can't change it (spec 017, AC-6). Contacts belong to the company, so they aren't held back.
 * An id that doesn't exist falls through, and the route answers 404.
 */
export function archivedGuard(db: DatabaseSync): RequestHandler {
  return (req, res, next) => {
    const id = owningApplicationId(db, req.method, req.path);
    if (id !== undefined) {
      const row = db.prepare("SELECT archived_at FROM applications WHERE id = ?").get(id);
      if (row?.archived_at != null) {
        res.status(409).json({ error: "Application is archived" } satisfies ErrorResponse);
        return;
      }
    }
    next();
  };
}
