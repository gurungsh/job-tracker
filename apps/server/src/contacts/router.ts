import type { DatabaseSync } from "node:sqlite";
import {
  type ErrorResponse,
  type ValidationErrorResponse,
  contactInputSchema,
  fieldErrors,
} from "@job-tracker/shared";
import express, { type Response, type Router } from "express";
import { createContact, deleteContact, listContacts, updateContact } from "./store.ts";

/** Routes for a company's contacts and for single contacts (spec 008). Mounted at /api. */
export function contactsRouter(db: DatabaseSync): Router {
  const router = express.Router();

  router.get("/companies/:id/contacts", (req, res) => {
    const id = parseId(req.params.id);
    const contacts = id === undefined ? undefined : listContacts(db, id);
    if (contacts) res.json(contacts);
    else notFound(res);
  });

  router.post("/companies/:id/contacts", (req, res) => {
    const id = parseId(req.params.id);
    if (id === undefined) {
      notFound(res);
      return;
    }
    const result = contactInputSchema.safeParse(req.body ?? {});
    if (!result.success) {
      invalid(res, fieldErrors(result.error));
      return;
    }
    const created = createContact(db, id, result.data, new Date().toISOString());
    if (created) res.status(201).json(created);
    else notFound(res);
  });

  router.put("/contacts/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === undefined) {
      notFound(res);
      return;
    }
    const result = contactInputSchema.safeParse(req.body ?? {});
    if (!result.success) {
      invalid(res, fieldErrors(result.error));
      return;
    }
    const updated = updateContact(db, id, result.data, new Date().toISOString());
    if (updated) res.json(updated);
    else notFound(res);
  });

  router.delete("/contacts/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id !== undefined && deleteContact(db, id)) res.status(204).end();
    else notFound(res);
  });

  return router;
}

function parseId(value: string | undefined): number | undefined {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

function invalid(res: Response, fields: Record<string, string>): void {
  res.status(400).json({ error: "Invalid contact", fields } satisfies ValidationErrorResponse);
}

function notFound(res: Response): void {
  res.status(404).json({ error: "Not found" } satisfies ErrorResponse);
}
