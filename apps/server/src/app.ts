import fs from "node:fs";
import path from "node:path";
import type { ErrorResponse, HealthResponse } from "@job-tracker/shared";
import express, { type ErrorRequestHandler, type Express } from "express";

export type AppOptions = {
  /** A built client to serve alongside the API. Leave it out in development, where Vite serves the client. */
  clientDir?: string | undefined;
};

export function createApp({ clientDir }: AppOptions = {}): Express {
  const app = express();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" } satisfies HealthResponse);
  });

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

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" } satisfies ErrorResponse);
};
