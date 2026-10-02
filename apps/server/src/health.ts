import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { HealthResponse } from "@job-tracker/shared";
import express, { type Router } from "express";

/** API requests and 5xx errors since the server started. Health checks aren't counted (spec 004, AC-19). */
export type RequestCounts = { requests: number; errors: number };

const packageJson = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "package.json"), "utf8")) as {
  version: string;
};

/** GET /api/health reports the app's status, version, uptime, database, and request counts (spec 004, AC-17 to AC-19). */
export function healthRouter(db: DatabaseSync, counts: RequestCounts): Router {
  const router = express.Router();
  const started = performance.now();

  router.get("/", (_req, res) => {
    const latestMigration = latestMigrationName(db);
    const ok = latestMigration !== undefined;
    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "error",
      version: packageJson.version,
      uptimeSeconds: Math.floor((performance.now() - started) / 1000),
      database: { status: ok ? "ok" : "error", latestMigration: latestMigration ?? null },
      requests: counts.requests,
      errors: counts.errors,
    } satisfies HealthResponse);
  });

  return router;
}

/** The latest applied migration's file name, or undefined when the database can't answer. */
function latestMigrationName(db: DatabaseSync): string | null | undefined {
  try {
    const row = db.prepare("SELECT name FROM schema_migrations ORDER BY version DESC LIMIT 1").get();
    return row === undefined ? null : String(row.name);
  } catch {
    return undefined;
  }
}
