import type { Application } from "@job-tracker/shared";

/** The applications that show on the board, in the table, and in the sidebar's counts (spec 017, AC-3). */
export function activeApplications<T extends Pick<Application, "archivedAt">>(applications: readonly T[]): T[] {
  return applications.filter((application) => application.archivedAt === null);
}

/** The archived ones, which show only in the Archived table (spec 017, AC-4). */
export function archivedApplications<T extends Pick<Application, "archivedAt">>(applications: readonly T[]): T[] {
  return applications.filter((application) => application.archivedAt !== null);
}
