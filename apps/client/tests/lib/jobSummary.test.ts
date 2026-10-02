import { describe, expect, it } from "vitest";
import { jobSummary } from "../../src/lib/jobSummary.ts";

const none = { location: null, workMode: null, employmentType: null, contractLengthMonths: null } as const;

describe("jobSummary (spec 011, AC-6)", () => {
  it.each([
    [{ location: "Charlotte, NC", workMode: "hybrid", employmentType: "contract", contractLengthMonths: 6 }, "Charlotte, NC • Hybrid • Contract · 6 mo"],
    [{ location: "Austin, TX", workMode: "onsite", employmentType: "full_time", contractLengthMonths: null }, "Austin, TX • Onsite • Full-time"],
    [{ location: null, workMode: "remote", employmentType: "part_time", contractLengthMonths: null }, "Remote • Part-time"],
    [{ location: "Denver", workMode: null, employmentType: null, contractLengthMonths: null }, "Denver"],
    [{ location: null, workMode: null, employmentType: "contract", contractLengthMonths: null }, "Contract"],
    [{ location: null, workMode: null, employmentType: "contract", contractLengthMonths: 12 }, "Contract · 12 mo"],
    [{ location: "Remote (US)", workMode: null, employmentType: "full_time", contractLengthMonths: null }, "Remote (US) • Full-time"],
  ] as const)("writes %j as %j", (application, expected) => {
    expect(jobSummary(application)).toBe(expected);
  });

  it("is empty when nothing is filled in", () => {
    expect(jobSummary(none)).toBe("");
  });
});
