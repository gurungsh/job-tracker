import type { DatabaseSync } from "node:sqlite";
import {
  applicationInputSchema,
  fieldErrors,
  type ErrorResponse,
  type ValidApplicationInput,
  type ValidationErrorResponse,
} from "@job-tracker/shared";
import express, { type Request, type Response, type Router } from "express";
import { localDate } from "../localDate.ts";
import {
  type Clock,
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from "./store.ts";

export function applicationsRouter(db: DatabaseSync): Router {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json(listApplications(db));
  });

  router.post("/", (req, res) => {
    const input = parseInput(req, res);
    if (!input) return;
    res.status(201).json(createApplication(db, input, clockFor(req)));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === undefined) {
      notFound(res);
      return;
    }
    const input = parseInput(req, res);
    if (!input) return;
    const updated = updateApplication(db, id, input, clockFor(req));
    if (updated) res.json(updated);
    else notFound(res);
  });

  router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id !== undefined && deleteApplication(db, id)) res.status(204).end();
    else notFound(res);
  });

  return router;
}

/** Validates the body, or sends a 400 naming each invalid field (spec 002, AC-21). */
function parseInput(req: Request, res: Response): ValidApplicationInput | undefined {
  const result = applicationInputSchema.safeParse(req.body ?? {});
  if (result.success) return result.data;
  res.status(400).json({ error: "Invalid application", fields: fieldErrors(result.error) } satisfies ValidationErrorResponse);
  return undefined;
}

/**
 * "Today" is the client's local date, from the browser's time zone in the X-Time-Zone header.
 * Without it (for example, from curl), the server's own time zone is used.
 */
function clockFor(req: Request): Clock {
  const now = new Date();
  return { today: localDate(now, req.get("X-Time-Zone")), now: now.toISOString() };
}

function parseId(value: string | undefined): number | undefined {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

function notFound(res: Response): void {
  res.status(404).json({ error: "Not found" } satisfies ErrorResponse);
}
