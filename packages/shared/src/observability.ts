import { z } from "zod";

/** Log levels, from most to least detailed (spec 004). */
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** GET /api/health. A failed database check makes the status "error" and the response a 503 (spec 004, AC-17, AC-18). */
export type HealthResponse = {
  status: "ok" | "error";
  version: string;
  uptimeSeconds: number;
  database: { status: "ok" | "error"; latestMigration: string | null };
  /** API requests since the server started, not counting health checks */
  requests: number;
  /** 5xx responses since the server started */
  errors: number;
};

/** What a browser error report describes (spec 004, AC-11 to AC-13). */
export const CLIENT_ERROR_KINDS = ["uncaught", "unhandledRejection", "render", "api"] as const;
export type ClientErrorKind = (typeof CLIENT_ERROR_KINDS)[number];

/** Field limits for a browser error report. The client trims to these before sending. */
export const CLIENT_ERROR_LIMITS = { message: 2000, stack: 20_000, page: 2000 } as const;

const count = new Intl.NumberFormat("en-US");

function text(label: string, max: number) {
  return z
    .string({ error: `${label} is required` })
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${count.format(max)} characters or fewer`);
}

export const clientErrorReportSchema = z
  .object({
    kind: z.enum(CLIENT_ERROR_KINDS, { error: "Kind is not valid" }),
    message: text("Message", CLIENT_ERROR_LIMITS.message),
    stack: z
      .string({ error: "Stack trace must be text" })
      .max(CLIENT_ERROR_LIMITS.stack, `Stack trace must be ${count.format(CLIENT_ERROR_LIMITS.stack)} characters or fewer`)
      .optional(),
    page: text("Page address", CLIENT_ERROR_LIMITS.page),
    api: z
      .object(
        {
          method: text("API method", 10),
          path: text("API path", 2000),
          /** 0 means the server couldn't be reached. */
          status: z.number({ error: "API status must be a number" }).int().min(0).max(599),
        },
        { error: "API call is not valid" },
      )
      .optional(),
  })
  .superRefine((report, ctx) => {
    if (report.kind === "api" && report.api === undefined) {
      ctx.addIssue({ code: "custom", path: ["api"], message: "API call is required for a failed API call" });
    }
    if (report.kind !== "api" && report.api !== undefined) {
      ctx.addIssue({ code: "custom", path: ["api"], message: "API call only applies to a failed API call" });
    }
  });

/** A browser error report sent to `POST /api/client-errors`. */
export type ClientErrorReport = z.input<typeof clientErrorReportSchema>;
