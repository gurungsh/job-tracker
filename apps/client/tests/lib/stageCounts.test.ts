import { STAGES } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import { stageCounts } from "../../src/lib/stageCounts.ts";

describe("stageCounts (spec 014, AC-2)", () => {
  it("gives 0 for every stage when there are no applications", () => {
    const counts = stageCounts([]);

    expect(Object.keys(counts)).toEqual([...STAGES]);
    expect(Object.values(counts).every((count) => count === 0)).toBe(true);
  });

  it("counts each stage, including the closed ones", () => {
    const counts = stageCounts([
      { stage: "applied" },
      { stage: "applied" },
      { stage: "offer" },
      { stage: "rejected" },
      { stage: "withdrawn" },
      { stage: "accepted" },
      { stage: "applied" },
    ]);

    expect(counts).toEqual({
      wishlist: 0,
      applied: 3,
      screening: 0,
      interviewing: 0,
      offer: 1,
      accepted: 1,
      rejected: 1,
      withdrawn: 1,
    });
  });
});
