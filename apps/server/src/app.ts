import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { ErrorResponse, HealthResponse } from "@job-tracker/shared";
import express, { type ErrorRequestHandler, type Express } from "express";
import { applicationsRouter } from "./applications/router.ts";
import { companiesRouter } from "./companies/router.ts";

export type AppOptions = {
  db: DatabaseSync;
  /** A built client to serve alongside the API. Leave it out in development, where Vite serves the client. */
  clientDir?: string | undefined;
};

export function createApp({ db, clientDir }: AppOptions): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" } satisfies HealthResponse);
  });

  app.use("/api/applications", applicationsRouter(db));
  app.use("/api/companies", companiesRouter(db));

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" } satisfies ErrorResponse);
  });

  if (clientDir !== undefined) {
    const indexHtml = path.join(clientDir, "index.html");
    if (!fs.existsSync(indexHtml)) {
      throw new Error(`Client build not found at ${clientDir}. Run \`npm run build\` first.`);
    }

    app.use(express.static(clientDir));
    // Any other GET is a client-side route, so the client decides what to show.
    app.get("/{*path}", (_req, res) => {
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (isBodyParseError(error)) {
    res.status(400).json({ error: "Request body is not valid JSON" } satisfies ErrorResponse);
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" } satisfies ErrorResponse);
};

/** express.json() marks a body it can't parse with this type. */
function isBodyParseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed";
}
