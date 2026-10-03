import type { Application, ApplicationInput } from "@job-tracker/shared";

/** The update request that saves an application as it is, with `changes` applied (spec 006, AC-2). */
export function applicationToInput(application: Application, changes: Partial<ApplicationInput> = {}): ApplicationInput {
  return {
    companyName: application.companyName,
    companyWebsite: application.companyWebsite,
    jobTitle: application.jobTitle,
    stage: application.stage,
    nextStep: application.nextStep,
    nextStepDue: application.nextStepDue,
    appliedOn: application.appliedOn,
    jobLink: application.jobLink,
    location: application.location,
    workMode: application.workMode,
    employmentType: application.employmentType,
    contractLengthMonths: application.contractLengthMonths,
    salaryMin: application.salaryMin,
    salaryMax: application.salaryMax,
    salaryPeriod: application.salaryPeriod,
    source: application.source,
    jobDescription: application.jobDescription,
    ...changes,
  };
}

/** Puts applications in the server's board order: due date (none last), then newest first (spec 002, AC-4). */
export function sortForBoard(applications: Application[]): Application[] {
  return [...applications].sort((a, b) => {
    if (a.nextStepDue !== b.nextStepDue) {
      if (a.nextStepDue === null) return 1;
      if (b.nextStepDue === null) return -1;
      return a.nextStepDue < b.nextStepDue ? -1 : 1;
    }
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return b.id - a.id;
  });
}

/** Where `moved` would sit among `cards` (a column without it) in board order (spec 019, AC-2, AC-5). */
export function boardIndex(cards: Application[], moved: Application): number {
  return sortForBoard([...cards, moved]).findIndex((a) => a.id === moved.id);
}
