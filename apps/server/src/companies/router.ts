import type { DatabaseSync } from "node:sqlite";
import express, { type Router } from "express";
import { listCompanies } from "../applications/store.ts";

export function companiesRouter(db: DatabaseSync): Router {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json(listCompanies(db));
  });

  return router;
}
