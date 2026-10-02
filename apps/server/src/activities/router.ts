import type { DatabaseSync } from "node:sqlite";
import {
  type ErrorResponse,
  type ValidationErrorResponse,
  activityInputSchema,
  activityUpdateSchema,
  fieldErrors,
} from "@job-tracker/shared";
import express, { type Response, type Router } from "express";
import { contactIsAtApplicationsCompany } from "../contacts/store.ts";
import { createActivity, deleteActivity, getActivity, listActivities, updateActivity } from "./store.ts";

/** Routes for an application's timeline and for single entries (spec 007). Mounted at /api. */
export function activitiesRouter(db: DatabaseSync): Router {
  const router = express.Router();

  router.get("/applications/:id/activities", (req, res) => {
    const id = parseId(req.params.id);
    const activities = id === undefined ? undefined : listActivities(db, id);
    if (activities) res.json(activities);
    else notFound(res);
  });

  router.post("/applications/:id/activities", (req, res) => {
    const id = parseId(req.params.id);
    if (id === undefined) {
      notFound(res);
      return;
    }
    const result = activityInputSchema.safeParse(req.body ?? {});
    if (!result.success) {
      invalid(res, fieldErrors(result.error));
      return;
    }
    if (!contactAllowed(db, result.data.contactId, id)) {
      invalid(res, { contactId: CONTACT_ERROR });
      return;
    }
    const created = createActivity(db, id, result.data, new Date().toISOString());
    if (created) res.status(201).json(created);
    else notFound(res);
  });

  router.put("/activities/:id", (req, res) => {
    const id = parseId(req.params.id);
    const existing = id === undefined ? undefined : getActivity(db, id);
    if (id === undefined || !existing) {
      notFound(res);
      return;
    }
    const result = activityUpdateSchema.safeParse(req.body ?? {});
    if (!result.success) {
      invalid(res, fieldErrors(result.error));
      return;
    }
    // An entry written when a stage changed keeps its type, and the others stay one of the loggable types (AC-8).
    const { type } = result.data;
    const keepsType = existing.type === "stage_change";
    if (type !== undefined && (keepsType ? type !== "stage_change" : type === "stage_change")) {
      invalid(res, { type: "Type is not valid" });
      return;
    }
    if (!contactAllowed(db, result.data.contactId, existing.applicationId)) {
      invalid(res, { contactId: CONTACT_ERROR });
      return;
    }
    res.json(updateActivity(db, id, result.data, new Date().toISOString()));
  });

  router.delete("/activities/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id !== undefined && deleteActivity(db, id)) res.status(204).end();
    else notFound(res);
  });

  return router;
}

const CONTACT_ERROR = "Choose a contact at this company";

/** An entry may name no one, or someone at its application's company (spec 008, AC-10). */
function contactAllowed(db: DatabaseSync, contactId: number | null, applicationId: number): boolean {
  return contactId === null || contactIsAtApplicationsCompany(db, contactId, applicationId);
}

function parseId(value: string | undefined): number | undefined {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

function invalid(res: Response, fields: Record<string, string>): void {
  res.status(400).json({ error: "Invalid activity", fields } satisfies ValidationErrorResponse);
}

function notFound(res: Response): void {
  res.status(404).json({ error: "Not found" } satisfies ErrorResponse);
}
