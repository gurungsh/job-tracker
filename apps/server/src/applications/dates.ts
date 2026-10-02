import { isAppliedOrLater, isClosedStage, type Stage } from "@job-tracker/shared";

export type StageDates = {
  /** YYYY-MM-DD */
  appliedOn: string | null;
  /** YYYY-MM-DD */
  closedOn: string | null;
  /** ISO 8601 UTC timestamp */
  stageChangedAt: string;
};

type StageDatesInput = {
  /** The application as stored before this save. Leave it out when creating. */
  previous?: StageDates & { stage: Stage };
  stage: Stage;
  /** The applied date sent by the client, which may have been edited by hand. */
  appliedOn: string | null;
  /** The client's local date, YYYY-MM-DD. */
  today: string;
  /** The current time, as an ISO 8601 UTC timestamp. */
  now: string;
};

/**
 * The automatic dates for an application being saved (spec 002, AC-12 to AC-15).
 * Dates change only on create or when the stage changes, so a save that keeps the
 * stage leaves them as they were, apart from an applied date edited by hand.
 */
export function stageDates({ previous, stage, appliedOn, today, now }: StageDatesInput): StageDates {
  if (previous && previous.stage === stage) {
    return { appliedOn, closedOn: previous.closedOn, stageChangedAt: previous.stageChangedAt };
  }

  let closedOn: string | null = null;
  if (isClosedStage(stage)) {
    closedOn = previous && isClosedStage(previous.stage) ? previous.closedOn : today;
  }

  return {
    appliedOn: appliedOn ?? (isAppliedOrLater(stage) ? today : null),
    closedOn,
    stageChangedAt: now,
  };
}
