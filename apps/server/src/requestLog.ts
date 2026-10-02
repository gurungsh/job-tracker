import { randomUUID } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import type { RequestCounts } from "./health.ts";
import { type LogFields, type Logger, runWithRequestId } from "./logger.ts";

/**
 * Gives each request an ID, sends it back in `X-Request-Id`, and logs the request when it closes
 * (spec 004, AC-1, AC-2, AC-6, AC-15), and counts it in `counts` (AC-19).
 * It goes first, so even requests with unreadable bodies are logged.
 */
export function requestLog(logger: Logger, counts: RequestCounts = { requests: 0, errors: 0 }): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();
    const started = performance.now();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    res.on("close", () => {
      runWithRequestId(requestId, () => {
        logRequest(logger, counts, req, res, Math.round(performance.now() - started));
      });
    });
    runWithRequestId(requestId, next);
  };
}

/** The ID that `requestLog` gave this request, if it ran. */
export function requestIdOf(res: Response): string | undefined {
  const { requestId } = res.locals;
  return typeof requestId === "string" ? requestId : undefined;
}

/** API requests, other than the health check, are logged at info and above. Everything else is debug. */
export function isApiRequest(path: string): boolean {
  return (path === "/api" || path.startsWith("/api/")) && path !== "/api/health";
}

function logRequest(logger: Logger, counts: RequestCounts, req: Request, res: Response, durationMs: number): void {
  const path = req.originalUrl.split("?")[0] ?? "";
  const status = res.statusCode;
  const aborted = !res.writableFinished;
  const api = isApiRequest(path);
  if (api) {
    counts.requests++;
    if (status >= 500) counts.errors++;
  }

  const level = !api ? "debug" : status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  const fields: LogFields = { method: req.method, path, status, durationMs };
  if (aborted) fields.aborted = true;
  // Request bodies can hold personal job data, so they're logged only at debug (spec 004, AC-6).
  if (logger.level === "debug" && hasBody(req.body)) fields.body = req.body;

  const message = `${req.method} ${path} ${String(status)} ${String(durationMs)}ms`;
  logger[level](aborted ? `${message} (client disconnected)` : message, fields);
}

function hasBody(body: unknown): boolean {
  return typeof body === "object" && body !== null && Object.keys(body).length > 0;
}
