export type HealthResponse = { status: "ok" };

export type ErrorResponse = { error: string };

/** A 400 response naming each invalid field. */
export type ValidationErrorResponse = ErrorResponse & { fields: Record<string, string> };

export * from "./applications.ts";
export * from "./jobDetails.ts";
export * from "./stages.ts";
