import type { ErrorResponse, HealthResponse } from "@job-tracker/shared";
import express, { type ErrorRequestHandler, type Express } from "express";

export function createApp(): Express {
  const app = express();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" } satisfies HealthResponse);
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" } satisfies ErrorResponse);
  });

  app.use(errorHandler);
  return app;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" } satisfies ErrorResponse);
};
