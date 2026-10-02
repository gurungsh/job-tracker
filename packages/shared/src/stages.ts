/** The application stages, in board order. */
export const STAGES = [
  "wishlist",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** Stages that close an application. */
export const CLOSED_STAGES: readonly Stage[] = ["accepted", "rejected", "withdrawn"];

export function isClosedStage(stage: Stage): boolean {
  return CLOSED_STAGES.includes(stage);
}

/** Every stage from Applied onward, including the closed ones. */
export function isAppliedOrLater(stage: Stage): boolean {
  return stage !== "wishlist";
}
