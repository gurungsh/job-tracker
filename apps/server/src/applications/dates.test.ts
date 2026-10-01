import type { Stage } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import { stageDates, type StageDates } from "./dates.ts";

const today = "2026-10-01";
const now = "2026-10-01T15:00:00.000Z";
const earlier = "2026-09-01T15:00:00.000Z";

function previous(stage: Stage, dates: Partial<StageDates> = {}) {
  return { stage, appliedOn: null, closedOn: null, stageChangedAt: earlier, ...dates };
}

describe("stageDates on create", () => {
  it("sets only the stage-changed time for a Wishlist application", () => {
    expect(stageDates({ stage: "wishlist", appliedOn: null, today, now })).toEqual({
      appliedOn: null,
      closedOn: null,
      stageChangedAt: now,
    });
  });

  it("sets the applied date to today when created in Applied or later", () => {
    expect(stageDates({ stage: "screening", appliedOn: null, today, now }).appliedOn).toBe(today);
  });

  it("keeps an applied date that was entered", () => {
    expect(stageDates({ stage: "applied", appliedOn: "2026-09-15", today, now }).appliedOn).toBe("2026-09-15");
  });

  it("sets the applied and closed dates when created in a closed stage", () => {
    expect(stageDates({ stage: "rejected", appliedOn: null, today, now })).toEqual({
      appliedOn: today,
      closedOn: today,
      stageChangedAt: now,
    });
  });
});

describe("stageDates on update", () => {
  it("sets the stage-changed time when the stage changes (AC-12)", () => {
    expect(stageDates({ previous: previous("applied", { appliedOn: "2026-09-01" }), stage: "screening", appliedOn: "2026-09-01", today, now }).stageChangedAt).toBe(now);
  });

  it("sets the applied date on a move into Applied or later when there is none (AC-13)", () => {
    expect(stageDates({ previous: previous("wishlist"), stage: "applied", appliedOn: null, today, now }).appliedOn).toBe(today);
  });

  it("doesn't change an existing applied date on later stage changes, including back to Wishlist (AC-13)", () => {
    const applied = previous("applied", { appliedOn: "2026-09-01" });

    expect(stageDates({ previous: applied, stage: "interviewing", appliedOn: "2026-09-01", today, now }).appliedOn).toBe("2026-09-01");
    expect(stageDates({ previous: applied, stage: "wishlist", appliedOn: "2026-09-01", today, now })).toEqual({
      appliedOn: "2026-09-01",
      closedOn: null,
      stageChangedAt: now,
    });
  });

  it("sets the closed date when an open application closes (AC-14)", () => {
    expect(stageDates({ previous: previous("offer", { appliedOn: "2026-09-01" }), stage: "accepted", appliedOn: "2026-09-01", today, now }).closedOn).toBe(today);
  });

  it("sets both dates when going straight from Wishlist to Rejected", () => {
    expect(stageDates({ previous: previous("wishlist"), stage: "rejected", appliedOn: null, today, now })).toEqual({
      appliedOn: today,
      closedOn: today,
      stageChangedAt: now,
    });
  });

  it("clears the closed date when a closed application reopens (AC-14)", () => {
    const rejected = previous("rejected", { appliedOn: "2026-09-01", closedOn: "2026-09-20" });

    expect(stageDates({ previous: rejected, stage: "interviewing", appliedOn: "2026-09-01", today, now }).closedOn).toBeNull();
  });

  it("keeps the original closed date when moving between closed stages", () => {
    const rejected = previous("rejected", { appliedOn: "2026-09-01", closedOn: "2026-09-20" });

    expect(stageDates({ previous: rejected, stage: "withdrawn", appliedOn: "2026-09-01", today, now }).closedOn).toBe("2026-09-20");
  });

  it("leaves every date alone when the stage doesn't change (AC-15)", () => {
    const rejected = previous("rejected", { appliedOn: "2026-09-01", closedOn: "2026-09-20" });

    expect(stageDates({ previous: rejected, stage: "rejected", appliedOn: "2026-09-01", today, now })).toEqual({
      appliedOn: "2026-09-01",
      closedOn: "2026-09-20",
      stageChangedAt: earlier,
    });
  });

  it("uses an applied date edited by hand, and a clear sticks while the stage is unchanged (AC-15)", () => {
    const applied = previous("applied", { appliedOn: "2026-09-01" });

    expect(stageDates({ previous: applied, stage: "applied", appliedOn: "2026-08-28", today, now }).appliedOn).toBe("2026-08-28");
    expect(stageDates({ previous: applied, stage: "applied", appliedOn: null, today, now }).appliedOn).toBeNull();
  });
});
