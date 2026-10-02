import type {
  Activity,
  ActivityInput,
  ActivityUpdate,
  Application,
  ApplicationInput,
  Company,
  Contact,
  ContactInput,
  Requirement,
  RequirementInput,
} from "@job-tracker/shared";
import { reportError } from "./errorReporting.ts";

/** A failed API call. `status` is 0 when the server couldn't be reached. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export const api = {
  listApplications: () => request<Application[]>("GET", "/api/applications"),
  listCompanies: () => request<Company[]>("GET", "/api/companies"),
  getApplication: (id: number) => request<Application>("GET", `/api/applications/${String(id)}`),
  createApplication: (input: ApplicationInput) => request<Application>("POST", "/api/applications", input),
  updateApplication: (id: number, input: ApplicationInput) =>
    request<Application>("PUT", `/api/applications/${String(id)}`, input),
  deleteApplication: (id: number) => request<undefined>("DELETE", `/api/applications/${String(id)}`),
  archiveApplication: (id: number) => request<Application>("POST", `/api/applications/${String(id)}/archive`),
  restoreApplication: (id: number) => request<Application>("POST", `/api/applications/${String(id)}/restore`),
  listActivities: (applicationId: number) =>
    request<Activity[]>("GET", `/api/applications/${String(applicationId)}/activities`),
  createActivity: (applicationId: number, input: ActivityInput) =>
    request<Activity>("POST", `/api/applications/${String(applicationId)}/activities`, input),
  updateActivity: (id: number, input: ActivityUpdate) => request<Activity>("PUT", `/api/activities/${String(id)}`, input),
  deleteActivity: (id: number) => request<undefined>("DELETE", `/api/activities/${String(id)}`),
  listContacts: (companyId: number) => request<Contact[]>("GET", `/api/companies/${String(companyId)}/contacts`),
  createContact: (companyId: number, input: ContactInput) =>
    request<Contact>("POST", `/api/companies/${String(companyId)}/contacts`, input),
  updateContact: (id: number, input: ContactInput) => request<Contact>("PUT", `/api/contacts/${String(id)}`, input),
  deleteContact: (id: number) => request<undefined>("DELETE", `/api/contacts/${String(id)}`),
  listRequirements: (applicationId: number) =>
    request<Requirement[]>("GET", `/api/applications/${String(applicationId)}/requirements`),
  createRequirement: (applicationId: number, input: RequirementInput) =>
    request<Requirement>("POST", `/api/applications/${String(applicationId)}/requirements`, input),
  updateRequirement: (id: number, input: RequirementInput) =>
    request<Requirement>("PUT", `/api/requirements/${String(id)}`, input),
  deleteRequirement: (id: number) => request<undefined>("DELETE", `/api/requirements/${String(id)}`),
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = {
      "Content-Type": "application/json",
      // The server uses this to work out "today" for applied and closed dates.
      "X-Time-Zone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(path, method === "GET" ? undefined : init);
  } catch {
    reportError({ kind: "api", message: `${method} ${path} failed: network error`, api: { method, path, status: 0 } });
    throw new ApiError("Can't reach the server. Check that it's running and try again.", 0);
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => undefined);
  if (response.status >= 500) {
    // The server logs its own 5xx errors too. This catches ones from a proxy, or a server that's restarting (spec 004, AC-13).
    reportError({
      kind: "api",
      message: `${method} ${path} failed with ${String(response.status)}`,
      api: { method, path, status: response.status },
    });
  }
  if (!response.ok) {
    const { error, fields } = (data ?? {}) as { error?: string; fields?: Record<string, string> };
    throw new ApiError(error ?? `The server returned an error (${String(response.status)}).`, response.status, fields);
  }
  return data as T;
}
