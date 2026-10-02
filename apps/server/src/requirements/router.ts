import type { DatabaseSync } from "node:sqlite";
import {
  type ErrorResponse,
  type ValidationErrorResponse,
  fieldErrors,
  requirementInputSchema,
} from "@job-tracker/shared";
import express, { type Response, type Router } from "express";
import { createRequirement, deleteRequirement, listRequirements, updateRequirement } from "./store.ts";

/** Routes for an application's requirements and for single requirements (spec 009). Mounted at /api. */
export function requirementsRouter(db: DatabaseSync): Router {
  const router = express.Router();

  router.get("/applications/:id/requirements", (req, res) => {
    const id = parseId(req.params.id);
    const requirements = id === undefined ? undefined : listRequirements(db, id);
    if (requirements) res.json(requirements);
    else notFound(res);
  });

  router.post("/applications/:id/requirements", (req, res) => {
    const id = parseId(req.params.id);
    if (id === undefined) {
      notFound(res);
      return;
    }
    const result = requirementInputSchema.safeParse(req.body ?? {});
    if (!result.success) {
      invalid(res, fieldErrors(result.error));
      return;
    }
    const created = createRequirement(db, id, result.data, new Date().toISOString());
    if (created) res.status(201).json(created);
    else notFound(res);
  });

  router.put("/requirements/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === undefined) {
      notFound(res);
      return;
    }
    const result = requirementInputSchema.safeParse(req.body ?? {});
    if (!result.success) {
      invalid(res, fieldErrors(result.error));
      return;
    }
    const updated = updateRequirement(db, id, result.data, new Date().toISOString());
    if (updated) res.json(updated);
    else notFound(res);
  });

  router.delete("/requirements/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id !== undefined && deleteRequirement(db, id)) res.status(204).end();
    else notFound(res);
  });

  return router;
}

function parseId(value: string | undefined): number | undefined {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

function invalid(res: Response, fields: Record<string, string>): void {
  res.status(400).json({ error: "Invalid requirement", fields } satisfies ValidationErrorResponse);
}

function notFound(res: Response): void {
  res.status(404).json({ error: "Not found" } satisfies ErrorResponse);
}
