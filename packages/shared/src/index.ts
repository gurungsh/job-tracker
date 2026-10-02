/** `requestId` is set on 500 responses, so the error can be found in the logs (spec 004, AC-16). */
export type ErrorResponse = { error: string; requestId?: string };

/** A 400 response naming each invalid field. */
export type ValidationErrorResponse = ErrorResponse & { fields: Record<string, string> };

export * from "./activities.ts";
export * from "./applications.ts";
export * from "./contacts.ts";
export * from "./jobDetails.ts";
export * from "./observability.ts";
export * from "./requirements.ts";
export * from "./stages.ts";
