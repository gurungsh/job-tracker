import { STAGE_LABELS, type Stage } from "@job-tracker/shared";
import "./StageBadge.css";

/** A stage's name on a tint of its color (spec 011, AC-2). */
export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className="stage-badge" data-stage={stage}>
      {STAGE_LABELS[stage]}
    </span>
  );
}
