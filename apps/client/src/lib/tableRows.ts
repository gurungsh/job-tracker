import {
  type Application,
  EMPLOYMENT_TYPE_LABELS,
  STAGES,
  WORK_MODE_LABELS,
} from "@job-tracker/shared";
import { daysInStage } from "./dates.ts";
import type { SortColumn, TableQuery } from "./tableQuery.ts";

const HOURS_PER_YEAR = 2080;

/** The rows that match the search and every filter that has a choice (spec 012, AC-6 to AC-9). */
export function filterApplications(applications: Application[], query: TableQuery): Application[] {
  const search = query.search.trim().toLowerCase();
  return applications.filter(
    (a) =>
      (search === "" || a.companyName.toLowerCase().includes(search) || a.jobTitle.toLowerCase().includes(search)) &&
      (query.stages.length === 0 || query.stages.includes(a.stage)) &&
      (query.workModes.length === 0 || (a.workMode !== null && query.workModes.includes(a.workMode))) &&
      (query.employmentTypes.length === 0 ||
        (a.employmentType !== null && query.employmentTypes.includes(a.employmentType))),
  );
}

type SortKey = string | number | null;

/** What a column sorts by. Null means empty, which always sorts last. */
function sortKey(a: Application, column: SortColumn, now: Date): SortKey {
  switch (column) {
    case "company":
      return a.companyName.toLowerCase();
    case "title":
      return a.jobTitle.toLowerCase();
    case "stage":
      return STAGES.indexOf(a.stage);
    case "location":
      return a.location?.toLowerCase() ?? null;
    case "mode":
      return a.workMode ? WORK_MODE_LABELS[a.workMode].toLowerCase() : null;
    case "type":
      return a.employmentType ? EMPLOYMENT_TYPE_LABELS[a.employmentType].toLowerCase() : null;
    case "pay": {
      const lowest = a.salaryMin ?? a.salaryMax;
      return lowest === null ? null : a.salaryPeriod === "hourly" ? lowest * HOURS_PER_YEAR : lowest;
    }
    case "next":
      // "0|" sorts before "1|", so rows with a due date come first, by date, then rows with only text.
      if (a.nextStepDue) return `0|${a.nextStepDue}`;
      return a.nextStep ? `1|${a.nextStep.toLowerCase()}` : null;
    case "age":
      return daysInStage(a.stageChangedAt, now);
  }
}

function compareKeys(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const x = String(a);
  const y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Puts the rows in the default order, which is stage order and then the order given, and then sorts by one column.
 * Ties and the empty values keep the default order (spec 012, AC-5, AC-11, AC-12).
 */
export function sortApplications(
  applications: Application[],
  sort: TableQuery["sort"],
  now = new Date(),
): Application[] {
  const byStage = [...applications].sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
  if (!sort) return byStage;
  const direction = sort.direction === "desc" ? -1 : 1;
  const keyed = byStage.map((application) => ({ application, key: sortKey(application, sort.column, now) }));
  keyed.sort((a, b) => {
    if (a.key === null || b.key === null) return a.key === b.key ? 0 : a.key === null ? 1 : -1;
    return compareKeys(a.key, b.key) * direction;
  });
  return keyed.map(({ application }) => application);
}
