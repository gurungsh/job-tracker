import { describe, expect, it } from "vitest";
import { activeApplications, archivedApplications } from "../../src/lib/archived.ts";
import { stageCounts } from "../../src/lib/stageCounts.ts";
import { application } from "../support/fakeServer.ts";

describe("activeApplications and archivedApplications (spec 017, AC-3, AC-4)", () => {
  const live = application({ companyName: "Acme", jobTitle: "A", stage: "applied" });
  const kept = application({ companyName: "Acme", jobTitle: "B", stage: "applied", archivedAt: "2026-10-02T09:00:00.000Z" });
  const all = [live, kept];

  it("splits the list in two, keeping the order", () => {
    expect(activeApplications(all)).toEqual([live]);
    expect(archivedApplications(all)).toEqual([kept]);
  });

  it("leaves archived applications out of the stage counts", () => {
    expect(stageCounts(activeApplications(all)).applied).toBe(1);
    expect(stageCounts(all).applied).toBe(2);
  });
});
