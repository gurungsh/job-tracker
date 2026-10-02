import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { ErrorResponse } from "@job-tracker/shared";
import express, { type ErrorRequestHandler, type Express } from "express";
import { applicationsRouter } from "./applications/router.ts";
import { clientErrorsRouter } from "./clientErrors.ts";
import { companiesRouter } from "./companies/router.ts";
import { healthRouter, type RequestCounts } from "./health.ts";
import { type Logger, silentLogger } from "./logger.ts";
import { requestIdOf, requestLog } from "./requestLog.ts";

export type AppOptions = {
  db: DatabaseSync;
  /** A built client to serve alongside the API. Leave it out in development, where Vite serves the client. */
  clientDir?: string | undefined;
  /** Where requests and errors are logged. Tests leave it out, so nothing is printed. */
  logger?: Logger;
};

export function createApp({ db, clientDir, logger = silentLogger }: AppOptions): Express {
  const app = express();
  const counts: RequestCounts = { requests: 0, errors: 0 };
  app.use(requestLog(logger, counts));
  app.use(express.json());

  app.use("/api/health", healthRouter(db, counts));

  app.use("/api/applications", applicationsRouter(db));
  app.use("/api/companies", companiesRouter(db));
  app.use("/api/client-errors", clientErrorsRouter(logger));

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

  app.use(errorHandler(logger));
  return app;
}

/** Answers with JSON errors. Unexpected errors are logged, and the 500 response carries the request ID (spec 004, AC-16). */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (isBodyParseError(error)) {
      res.status(400).json({ error: "Request body is not valid JSON" } satisfies ErrorResponse);
      return;
    }

    logger.error("Unhandled error", { error });
    res.status(500).json({ error: "Internal server error", requestId: requestIdOf(res) } satisfies ErrorResponse);
  };
}

/** express.json() marks a body it can't parse with this type. */
function isBodyParseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed";
}
