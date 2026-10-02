import { EMPLOYMENT_TYPES, type EmploymentType, STAGES, type Stage, WORK_MODES, type WorkMode } from "@job-tracker/shared";

export const SORT_COLUMNS = ["company", "title", "stage", "location", "mode", "type", "pay", "next", "age"] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];
export type SortDirection = "asc" | "desc";

/** The table's search, filters, and sort, as kept in the page address (spec 012, AC-13). */
export type TableQuery = {
  search: string;
  stages: Stage[];
  workModes: WorkMode[];
  employmentTypes: EmploymentType[];
  sort: { column: SortColumn; direction: SortDirection } | null;
};

/** The values of `key` that are in `allowed`, once each, in the order of `allowed`. */
function chosen<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  const given = new Set(params.getAll(key));
  return allowed.filter((value) => given.has(value));
}

/** Reads the address. Values that aren't valid are ignored and the rest still applies (spec 012, AC-14). */
export function parseTableQuery(params: URLSearchParams): TableQuery {
  const column = SORT_COLUMNS.find((value) => value === params.get("sort"));
  return {
    search: params.get("q") ?? "",
    stages: chosen(params, "stage", STAGES),
    workModes: chosen(params, "mode", WORK_MODES),
    employmentTypes: chosen(params, "type", EMPLOYMENT_TYPES),
    sort: column ? { column, direction: params.get("dir") === "desc" ? "desc" : "asc" } : null,
  };
}

/** Writes only what is set, so the default view has a clean address. */
export function toSearchParams(query: TableQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search !== "") params.set("q", query.search);
  for (const stage of query.stages) params.append("stage", stage);
  for (const mode of query.workModes) params.append("mode", mode);
  for (const type of query.employmentTypes) params.append("type", type);
  if (query.sort) {
    params.set("sort", query.sort.column);
    params.set("dir", query.sort.direction);
  }
  return params;
}
