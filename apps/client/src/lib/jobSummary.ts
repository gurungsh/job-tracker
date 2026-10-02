import { EMPLOYMENT_TYPE_LABELS, type Application, WORK_MODE_LABELS } from "@job-tracker/shared";

/** "Contract · 6 mo", "Full-time", or empty when there is no employment type (spec 011, AC-6). */
export function employmentLabel(application: Pick<Application, "employmentType" | "contractLengthMonths">): string {
  const { employmentType, contractLengthMonths } = application;
  if (!employmentType) return "";
  const length = employmentType === "contract" && contractLengthMonths !== null ? ` · ${String(contractLengthMonths)} mo` : "";
  return EMPLOYMENT_TYPE_LABELS[employmentType] + length;
}

/** "Charlotte, NC • Hybrid • Contract · 6 mo": the parts that are filled in, in that order. Empty when none are (spec 011, AC-6). */
export function jobSummary(application: Pick<Application, "location" | "workMode" | "employmentType" | "contractLengthMonths">): string {
  const { location, workMode } = application;
  return [location, workMode ? WORK_MODE_LABELS[workMode] : null, employmentLabel(application)].filter(Boolean).join(" • ");
}
