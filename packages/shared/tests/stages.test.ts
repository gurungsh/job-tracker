import { describe, expect, it } from "vitest";
import { CLOSED_STAGES, STAGE_LABELS, STAGES, isAppliedOrLater, isClosedStage } from "../src/stages.ts";

describe("stages", () => {
  it("lists the eight stages in board order", () => {
    expect(STAGES).toEqual([
      "wishlist",
      "applied",
      "screening",
      "interviewing",
      "offer",
      "accepted",
      "rejected",
      "withdrawn",
    ]);
    expect(STAGES.map((stage) => STAGE_LABELS[stage])).toEqual([
      "Wishlist",
      "Applied",
      "Screening",
      "Interviewing",
      "Offer",
      "Accepted",
      "Rejected",
      "Withdrawn",
    ]);
  });

  it("treats Accepted, Rejected, and Withdrawn as closed", () => {
    expect(CLOSED_STAGES).toEqual(["accepted", "rejected", "withdrawn"]);
    expect(STAGES.filter(isClosedStage)).toEqual(["accepted", "rejected", "withdrawn"]);
  });

  it("treats every stage except Wishlist as applied or later", () => {
    expect(STAGES.filter(isAppliedOrLater)).toEqual(STAGES.slice(1));
  });
});
