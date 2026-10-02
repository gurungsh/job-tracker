import { describe, expect, it } from "vitest";
import { fieldErrors } from "./applications.ts";
import { CLIENT_ERROR_KINDS, CLIENT_ERROR_LIMITS, clientErrorReportSchema } from "./observability.ts";

function errorsFor(input: unknown): Record<string, string> {
  const result = clientErrorReportSchema.safeParse(input);
  return result.success ? {} : fieldErrors(result.error);
}

const base = { message: "Boom", page: "http://localhost:5173/" };
const apiCall = { method: "GET", path: "/api/applications", status: 502 };

describe("clientErrorReportSchema", () => {
  it.each(CLIENT_ERROR_KINDS.filter((kind) => kind !== "api"))("accepts a %s report", (kind) => {
    const report = { ...base, kind, stack: "Error: Boom\n    at x.js:1:1" };
    expect(clientErrorReportSchema.parse(report)).toEqual(report);
  });

  it("accepts an api report, including a network error with status 0", () => {
    expect(clientErrorReportSchema.parse({ ...base, kind: "api", api: apiCall })).toEqual({ ...base, kind: "api", api: apiCall });
    expect(errorsFor({ ...base, kind: "api", api: { ...apiCall, status: 0 } })).toEqual({});
  });

  it("requires a message, a page, and a known kind", () => {
    expect(errorsFor({ kind: "uncaught", message: "", page: "" })).toEqual({
      message: "Message is required",
      page: "Page address is required",
    });
    expect(errorsFor({ ...base })).toEqual({ kind: "Kind is not valid" });
    expect(errorsFor({ ...base, kind: "oops" })).toEqual({ kind: "Kind is not valid" });
  });

  it("rejects fields over their limits", () => {
    expect(
      errorsFor({
        kind: "uncaught",
        message: "m".repeat(CLIENT_ERROR_LIMITS.message + 1),
        stack: "s".repeat(CLIENT_ERROR_LIMITS.stack + 1),
        page: "p".repeat(CLIENT_ERROR_LIMITS.page + 1),
      }),
    ).toEqual({
      message: "Message must be 2,000 characters or fewer",
      stack: "Stack trace must be 20,000 characters or fewer",
      page: "Page address must be 2,000 characters or fewer",
    });
  });

  it("accepts fields exactly at their limits", () => {
    expect(
      errorsFor({
        kind: "uncaught",
        message: "m".repeat(CLIENT_ERROR_LIMITS.message),
        stack: "s".repeat(CLIENT_ERROR_LIMITS.stack),
        page: "p".repeat(CLIENT_ERROR_LIMITS.page),
      }),
    ).toEqual({});
  });

  it("requires the API call for an api report, and only for one", () => {
    expect(errorsFor({ ...base, kind: "api" })).toEqual({ api: "API call is required for a failed API call" });
    expect(errorsFor({ ...base, kind: "uncaught", api: apiCall })).toEqual({ api: "API call only applies to a failed API call" });
    expect(errorsFor({ ...base, kind: "api", api: { ...apiCall, status: 700 } })).toHaveProperty("api");
  });
});
