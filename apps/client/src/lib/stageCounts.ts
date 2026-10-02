import { type Application, STAGES, type Stage } from "@job-tracker/shared";

/** How many applications are at each stage, closed stages included. A stage with none counts 0 (spec 014, AC-2). */
export function stageCounts(applications: readonly Pick<Application, "stage">[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<Stage, number>;
  for (const { stage } of applications) counts[stage] += 1;
  return counts;
}
