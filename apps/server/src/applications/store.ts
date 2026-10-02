import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type {
  Application,
  Company,
  EmploymentType,
  SalaryPeriod,
  Stage,
  ValidApplicationInput,
  WorkMode,
} from "@job-tracker/shared";
import { addedText, movedText } from "@job-tracker/shared";
import { insertActivity } from "../activities/store.ts";
import { stageDates } from "./dates.ts";

/** When a write happens: the client's local date (YYYY-MM-DD) and the current UTC timestamp. */
export type Clock = { today: string; now: string };

type Row = Record<string, SQLOutputValue>;

const selectApplications = `
  SELECT a.id, a.company_id, c.name AS company_name, a.job_title, a.stage, a.next_step, a.next_step_due,
         a.applied_on, a.closed_on, a.stage_changed_at, a.created_at, a.updated_at,
         a.job_link, a.location, a.work_mode, a.employment_type, a.contract_length_months,
         a.salary_min, a.salary_max, a.salary_period, a.source, a.job_description
  FROM applications a
  JOIN companies c ON c.id = a.company_id`;

export function listApplications(db: DatabaseSync): Application[] {
  // Soonest due date first, undated last, and newest first within a tie (spec 002, AC-4).
  return db
    .prepare(`${selectApplications} ORDER BY a.next_step_due IS NULL, a.next_step_due, a.created_at DESC, a.id DESC`)
    .all()
    .map(toApplication);
}

export function listCompanies(db: DatabaseSync): Company[] {
  return db
    .prepare("SELECT id, name FROM companies ORDER BY name COLLATE NOCASE")
    .all()
    .map((row) => ({ id: Number(row.id), name: String(row.name) }));
}

export function createApplication(db: DatabaseSync, input: ValidApplicationInput, clock: Clock): Application {
  return inTransaction(db, () => {
    const companyId = findOrCreateCompany(db, input.companyName, clock.now);
    const dates = stageDates({ stage: input.stage, appliedOn: input.appliedOn, ...clock });
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO applications (company_id, job_title, stage, next_step, next_step_due, applied_on, closed_on,
                                   stage_changed_at, created_at, updated_at, ${detailColumns.join(", ")})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${detailColumns.map(() => "?").join(", ")})`,
      )
      .run(
        companyId,
        input.jobTitle,
        input.stage,
        input.nextStep,
        input.nextStepDue,
        dates.appliedOn,
        dates.closedOn,
        dates.stageChangedAt,
        clock.now,
        clock.now,
        ...detailValues(input),
      );
    const id = Number(lastInsertRowid);
    insertActivity(db, id, "stage_change", clock.today, addedText(input.stage), clock.now);
    return getApplication(db, id) as Application;
  });
}

/** Replaces an application's editable fields. Returns undefined if it doesn't exist. */
export function updateApplication(
  db: DatabaseSync,
  id: number,
  input: ValidApplicationInput,
  clock: Clock,
): Application | undefined {
  return inTransaction(db, () => {
    const previous = getApplication(db, id);
    if (!previous) return undefined;

    const companyId = findOrCreateCompany(db, input.companyName, clock.now);
    const dates = stageDates({ previous, stage: input.stage, appliedOn: input.appliedOn, ...clock });
    db.prepare(
      `UPDATE applications
       SET company_id = ?, job_title = ?, stage = ?, next_step = ?, next_step_due = ?, applied_on = ?, closed_on = ?,
           stage_changed_at = ?, updated_at = ?, ${detailColumns.map((column) => `${column} = ?`).join(", ")}
       WHERE id = ?`,
    ).run(
      companyId,
      input.jobTitle,
      input.stage,
      input.nextStep,
      input.nextStepDue,
      dates.appliedOn,
      dates.closedOn,
      dates.stageChangedAt,
      clock.now,
      ...detailValues(input),
      id,
    );
    // Contacts belong to a company, so entries stop naming them when the application moves (spec 008, AC-11).
    if (previous.companyId !== companyId) {
      db.prepare("UPDATE activities SET contact_id = NULL WHERE application_id = ?").run(id);
    }
    if (previous.stage !== input.stage) {
      insertActivity(db, id, "stage_change", clock.today, movedText(previous.stage, input.stage), clock.now);
    }
    return getApplication(db, id);
  });
}

/** Returns false if the application doesn't exist. */
export function deleteApplication(db: DatabaseSync, id: number): boolean {
  return db.prepare("DELETE FROM applications WHERE id = ?").run(id).changes > 0;
}

// Job detail columns (spec 003), in the order detailValues() returns them.
const detailColumns = [
  "job_link",
  "location",
  "work_mode",
  "employment_type",
  "contract_length_months",
  "salary_min",
  "salary_max",
  "salary_period",
  "source",
  "job_description",
];

function detailValues(input: ValidApplicationInput) {
  return [
    input.jobLink,
    input.location,
    input.workMode,
    input.employmentType,
    input.contractLengthMonths,
    input.salaryMin,
    input.salaryMax,
    input.salaryPeriod,
    input.source,
    input.jobDescription,
  ];
}

function getApplication(db: DatabaseSync, id: number): Application | undefined {
  const row = db.prepare(`${selectApplications} WHERE a.id = ?`).get(id);
  return row ? toApplication(row) : undefined;
}

/** The company's name column ignores case, so "acme corp" finds "Acme Corp" (spec 002, AC-18). */
function findOrCreateCompany(db: DatabaseSync, name: string, now: string): number {
  const existing = db.prepare("SELECT id FROM companies WHERE name = ?").get(name);
  if (existing) return Number(existing.id);
  const { lastInsertRowid } = db.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run(name, now);
  return Number(lastInsertRowid);
}

function inTransaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function toApplication(row: Row): Application {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    companyName: String(row.company_name),
    jobTitle: String(row.job_title),
    stage: row.stage as Stage,
    nextStep: nullableText(row.next_step),
    nextStepDue: nullableText(row.next_step_due),
    appliedOn: nullableText(row.applied_on),
    closedOn: nullableText(row.closed_on),
    stageChangedAt: String(row.stage_changed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    jobLink: nullableText(row.job_link),
    location: nullableText(row.location),
    workMode: nullableText(row.work_mode) as WorkMode | null,
    employmentType: nullableText(row.employment_type) as EmploymentType | null,
    contractLengthMonths: nullableNumber(row.contract_length_months),
    salaryMin: nullableNumber(row.salary_min),
    salaryMax: nullableNumber(row.salary_max),
    salaryPeriod: nullableText(row.salary_period) as SalaryPeriod | null,
    source: nullableText(row.source),
    jobDescription: nullableText(row.job_description),
  };
}

function nullableNumber(value: SQLOutputValue | undefined): number | null {
  return value == null ? null : Number(value);
}

function nullableText(value: SQLOutputValue | undefined): string | null {
  return value == null ? null : String(value);
}
