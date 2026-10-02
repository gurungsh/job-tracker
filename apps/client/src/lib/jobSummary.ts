import { EMPLOYMENT_TYPE_LABELS, type Application, WORK_MODE_LABELS } from "@job-tracker/shared";

/** "Charlotte, NC • Hybrid • Contract · 6 mo": the parts that are filled in, in that order. Empty when none are (spec 011, AC-6). */
export function jobSummary(application: Pick<Application, "location" | "workMode" | "employmentType" | "contractLengthMonths">): string {
  const { location, workMode, employmentType, contractLengthMonths } = application;
  const employment = employmentType
    ? EMPLOYMENT_TYPE_LABELS[employmentType] +
      (employmentType === "contract" && contractLengthMonths !== null ? ` · ${String(contractLengthMonths)} mo` : "")
    : null;
  return [location, workMode ? WORK_MODE_LABELS[workMode] : null, employment].filter(Boolean).join(" • ");
}
