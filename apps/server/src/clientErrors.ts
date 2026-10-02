import { clientErrorReportSchema, fieldErrors, type ValidationErrorResponse } from "@job-tracker/shared";
import express, { type Router } from "express";
import type { Logger } from "./logger.ts";

/** POST /api/client-errors logs an error reported by the browser (spec 004, AC-11 to AC-14). */
export function clientErrorsRouter(logger: Logger): Router {
  const router = express.Router();

  router.post("/", (req, res) => {
    const result = clientErrorReportSchema.safeParse(req.body ?? {});
    if (!result.success) {
      res
        .status(400)
        .json({ error: "Invalid error report", fields: fieldErrors(result.error) } satisfies ValidationErrorResponse);
      return;
    }

    const { message, kind, page, stack, api } = result.data;
    logger.error(message, { source: "browser", kind, page, api, stack });
    res.status(204).end();
  });

  return router;
}
