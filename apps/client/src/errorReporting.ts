import { CLIENT_ERROR_LIMITS, type ClientErrorReport } from "@job-tracker/shared";

/** At most this many reports are sent in any 60 seconds. Extra ones are dropped (spec 004). */
const MAX_REPORTS_PER_MINUTE = 10;

let sentAt: number[] = [];

/**
 * Sends an error to the server's log (spec 004, AC-11 to AC-13). It never throws, and a report
 * that fails to send is dropped, not reported again.
 */
export function reportError(report: Omit<ClientErrorReport, "page">): void {
  const now = Date.now();
  sentAt = sentAt.filter((time) => now - time < 60_000);
  if (sentAt.length >= MAX_REPORTS_PER_MINUTE) return;
  sentAt.push(now);

  const body: ClientErrorReport = {
    ...report,
    message: (report.message || "Unknown error").slice(0, CLIENT_ERROR_LIMITS.message),
    stack: report.stack?.slice(0, CLIENT_ERROR_LIMITS.stack),
    page: window.location.href.slice(0, CLIENT_ERROR_LIMITS.page),
  };
  try {
    // Sent directly, not through api.ts, so a failed report can't report itself.
    fetch("/api/client-errors", {
      method: "POST",
      // Lets the report finish even if the page is reloading.
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  } catch {
    // Nothing else to do.
  }
}

/** The message and stack of anything thrown, which may not be an Error. */
export function describeError(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) return value.stack === undefined ? { message: value.message } : { message: value.message, stack: value.stack };
  return { message: typeof value === "string" ? value : String(value) };
}

/** Reports uncaught errors and unhandled promise rejections. Returns a function that stops it. */
export function installErrorReporting(): () => void {
  const onError = (event: ErrorEvent) => {
    reportError({ kind: "uncaught", ...describeError(event.error ?? event.message) });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError({ kind: "unhandledRejection", ...describeError(event.reason) });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

/** Forgets past reports, so the limit starts over. For tests. */
export function resetErrorReporting(): void {
  sentAt = [];
}
