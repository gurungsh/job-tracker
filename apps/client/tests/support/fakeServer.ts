// An in-memory stand-in for the API, installed as the global fetch in UI tests.
// It mirrors the real routes closely enough for the UI; the real rules are tested on the server.
import {
  type Activity,
  type Application,
  type ApplicationInput,
  type Company,
  type Contact,
  type Requirement,
  activityInputSchema,
  activityUpdateSchema,
  applicationInputSchema,
  contactInputSchema,
  fieldErrors,
  requirementInputSchema,
} from "@job-tracker/shared";
import { vi } from "vitest";

type Handler = (method: string, path: string, body: unknown) => Response | undefined;

export type FakeServer = {
  applications: Application[];
  companies: Company[];
  activities: Activity[];
  contacts: Contact[];
  requirements: Requirement[];
  requests: { method: string; path: string; body: unknown }[];
  /** Makes the next requests fail as if the server were down, until called again with false. */
  setOffline: (offline: boolean) => void;
  /** Overrides the response for matching requests. */
  override: (handler: Handler) => void;
};

let nextId = 100;

export function application(fields: Partial<Application> & Pick<Application, "companyName" | "jobTitle">): Application {
  const now = "2026-10-01T12:00:00.000Z";
  nextId += 1;
  return {
    id: nextId,
    companyId: nextId,
    stage: "wishlist",
    nextStep: null,
    nextStepDue: null,
    appliedOn: null,
    closedOn: null,
    stageChangedAt: now,
    createdAt: now,
    updatedAt: now,
    jobLink: null,
    location: null,
    workMode: null,
    employmentType: null,
    contractLengthMonths: null,
    salaryMin: null,
    salaryMax: null,
    salaryPeriod: null,
    source: null,
    jobDescription: null,
    ...fields,
  };
}

let nextActivityId = 500;

export function activity(fields: Partial<Activity> & Pick<Activity, "applicationId">): Activity {
  nextActivityId += 1;
  const now = "2026-10-01T12:00:00.000Z";
  return {
    id: nextActivityId,
    type: "note",
    occurredOn: "2026-10-01",
    text: "A note",
    contactId: null,
    contactName: null,
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

let nextRequirementId = 900;

export function requirement(fields: Partial<Requirement> & Pick<Requirement, "applicationId">): Requirement {
  nextRequirementId += 1;
  const now = "2026-10-01T12:00:00.000Z";
  return { id: nextRequirementId, text: "A requirement", kind: "required", met: false, createdAt: now, updatedAt: now, ...fields };
}

let nextContactId = 700;

export function contact(fields: Partial<Contact> & Pick<Contact, "companyId" | "name">): Contact {
  nextContactId += 1;
  const now = "2026-10-01T12:00:00.000Z";
  return { id: nextContactId, role: null, email: null, phone: null, notes: null, entryCount: 0, createdAt: now, updatedAt: now, ...fields };
}

export function installFakeServer(applications: Application[] = [], companyNames: string[] = []): FakeServer {
  const server: FakeServer = {
    applications: [...applications],
    companies: companyNames.map((name, index) => ({ id: index + 1, name })),
    activities: [],
    contacts: [],
    requirements: [],
    requests: [],
    setOffline: (value) => {
      offline = value;
    },
    override: (handler) => {
      overrides.push(handler);
    },
  };
  let offline = false;
  const overrides: Handler[] = [];

  function companyFor(name: string): Company {
    const trimmed = name.trim();
    let company = server.companies.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (!company) {
      company = { id: server.companies.length + 1, name: trimmed };
      server.companies.push(company);
    }
    return company;
  }

  function save(input: ApplicationInput, previous?: Application): Application {
    // Normalize with the real schema, as the server does. The date rules aren't modeled here.
    const { companyName, ...fields } = applicationInputSchema.parse(input);
    const company = companyFor(companyName);
    const now = new Date().toISOString();
    return {
      ...(previous ?? application({ companyName: company.name, jobTitle: fields.jobTitle })),
      ...fields,
      companyId: company.id,
      companyName: company.name,
      stageChangedAt: previous && previous.stage === fields.stage ? previous.stageChangedAt : now,
      updatedAt: now,
    };
  }

  function contactName(id: number | null): string | null {
    return server.contacts.find((c) => c.id === id)?.name ?? null;
  }

  /** Contacts with the number of entries that name them, as the server counts them. */
  function contactsOf(companyId: number): Contact[] {
    return server.contacts
      .filter((c) => c.companyId === companyId)
      .map((c) => ({ ...c, entryCount: server.activities.filter((a) => a.contactId === c.id).length }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);
  }

  /** Required first, then preferred, each in the order added (spec 009, AC-4). */
  function requirementsOf(applicationId: number): Requirement[] {
    return server.requirements
      .filter((r) => r.applicationId === applicationId)
      .sort((a, b) => (a.kind === b.kind ? a.id - b.id : a.kind === "required" ? -1 : 1));
  }

  // The server's timeline order: newest date first, then the last one added (spec 007, AC-3).
  function timelineOf(applicationId: number): Activity[] {
    return server.activities
      .filter((a) => a.applicationId === applicationId)
      .sort((a, b) => (a.occurredOn === b.occurredOn ? b.id - a.id : a.occurredOn < b.occurredOn ? 1 : -1));
  }

  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    server.requests.push({ method, path, body });
    if (offline) return Promise.reject(new TypeError("Failed to fetch"));
    for (const handler of overrides) {
      const response = handler(method, path, body);
      if (response) return Promise.resolve(response);
    }

    const id = Number(/^\/api\/applications\/(\d+)$/.exec(path)?.[1]);
    const index = server.applications.findIndex((a) => a.id === id);

    const timelineId = Number(/^\/api\/applications\/(\d+)\/activities$/.exec(path)?.[1]);
    if (Number.isFinite(timelineId) && (method === "GET" || method === "POST")) {
      if (method === "GET") return json(timelineOf(timelineId));
      const parsed = activityInputSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid activity", fields: fieldErrors(parsed.error) }, 400);
      const created = activity({ applicationId: timelineId, ...parsed.data, contactName: contactName(parsed.data.contactId) });
      server.activities.push(created);
      return json(created, 201);
    }
    const activityId = Number(/^\/api\/activities\/(\d+)$/.exec(path)?.[1]);
    const activityIndex = server.activities.findIndex((a) => a.id === activityId);
    if (Number.isFinite(activityId) && activityIndex >= 0 && method === "PUT") {
      const parsed = activityUpdateSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid activity", fields: fieldErrors(parsed.error) }, 400);
      const { type, ...rest } = parsed.data;
      const current = server.activities[activityIndex] as Activity;
      const updated = { ...current, ...rest, type: type ?? current.type, contactName: contactName(rest.contactId) };
      server.activities[activityIndex] = updated;
      return json(updated);
    }
    if (Number.isFinite(activityId) && activityIndex >= 0 && method === "DELETE") {
      server.activities.splice(activityIndex, 1);
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    const requirementsApplicationId = Number(/^\/api\/applications\/(\d+)\/requirements$/.exec(path)?.[1]);
    if (Number.isFinite(requirementsApplicationId) && (method === "GET" || method === "POST")) {
      if (method === "GET") return json(requirementsOf(requirementsApplicationId));
      const parsed = requirementInputSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid requirement", fields: fieldErrors(parsed.error) }, 400);
      const created = requirement({ applicationId: requirementsApplicationId, ...parsed.data });
      server.requirements.push(created);
      return json(created, 201);
    }
    const requirementId = Number(/^\/api\/requirements\/(\d+)$/.exec(path)?.[1]);
    const requirementIndex = server.requirements.findIndex((r) => r.id === requirementId);
    if (Number.isFinite(requirementId) && requirementIndex >= 0 && method === "PUT") {
      const parsed = requirementInputSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid requirement", fields: fieldErrors(parsed.error) }, 400);
      const updatedRequirement = { ...(server.requirements[requirementIndex] as Requirement), ...parsed.data };
      server.requirements[requirementIndex] = updatedRequirement;
      return json(updatedRequirement);
    }
    if (Number.isFinite(requirementId) && requirementIndex >= 0 && method === "DELETE") {
      server.requirements.splice(requirementIndex, 1);
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    const companyContactsId = Number(/^\/api\/companies\/(\d+)\/contacts$/.exec(path)?.[1]);
    if (Number.isFinite(companyContactsId) && (method === "GET" || method === "POST")) {
      if (method === "GET") return json(contactsOf(companyContactsId));
      const parsed = contactInputSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid contact", fields: fieldErrors(parsed.error) }, 400);
      const created = contact({ companyId: companyContactsId, ...parsed.data });
      server.contacts.push(created);
      return json(created, 201);
    }
    const contactId = Number(/^\/api\/contacts\/(\d+)$/.exec(path)?.[1]);
    const contactIndex = server.contacts.findIndex((c) => c.id === contactId);
    if (Number.isFinite(contactId) && contactIndex >= 0 && method === "PUT") {
      const parsed = contactInputSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid contact", fields: fieldErrors(parsed.error) }, 400);
      const updatedContact = { ...(server.contacts[contactIndex] as Contact), ...parsed.data };
      server.contacts[contactIndex] = updatedContact;
      // Entries that name the contact show its new name.
      server.activities = server.activities.map((a) => (a.contactId === contactId ? { ...a, contactName: parsed.data.name } : a));
      return json(contactsOf(updatedContact.companyId).find((c) => c.id === contactId));
    }
    if (Number.isFinite(contactId) && contactIndex >= 0 && method === "DELETE") {
      server.contacts.splice(contactIndex, 1);
      server.activities = server.activities.map((a) => (a.contactId === contactId ? { ...a, contactId: null, contactName: null } : a));
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    if (method === "GET" && path === "/api/applications") return json(server.applications);
    if (method === "GET" && path === "/api/companies") return json(server.companies);
    if (method === "POST" && path === "/api/client-errors") return Promise.resolve(new Response(null, { status: 204 }));
    if (method === "POST" && path === "/api/applications") {
      const created = save(body as ApplicationInput);
      server.applications.push(created);
      return json(created, 201);
    }
    if (method === "PUT" && index >= 0) {
      const updated = save(body as ApplicationInput, server.applications[index]);
      server.applications[index] = updated;
      return json(updated);
    }
    if (method === "DELETE" && index >= 0) {
      server.applications.splice(index, 1);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return json({ error: "Not found" }, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
  return server;
}

export function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}
