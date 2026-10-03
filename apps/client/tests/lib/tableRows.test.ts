import type { Application } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import { filterApplications, sortApplications } from "../../src/lib/tableRows.ts";
import type { SortColumn, TableQuery } from "../../src/lib/tableQuery.ts";
import { application } from "../support/fakeServer.ts";

const NOW = new Date(2026, 9, 10, 9, 0);
const none: TableQuery = { search: "", stages: [], workModes: [], employmentTypes: [], archived: false, sort: null };

function names(applications: Application[]) {
  return applications.map((a) => a.companyName);
}

describe("filterApplications (spec 012, AC-6 to AC-9)", () => {
  const list = [
    application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied", workMode: "remote", employmentType: "full_time" }),
    application({ companyName: "Globex", jobTitle: "Acme liaison", stage: "offer", workMode: "onsite", employmentType: "contract" }),
    application({ companyName: "Initech", jobTitle: "C++ Developer (Senior)", stage: "applied" }),
  ];

  it("keeps everything with no search or filters", () => {
    expect(filterApplications(list, none)).toEqual(list);
  });

  it("matches the company or the title, ignoring capitals and outer spaces (AC-6)", () => {
    expect(names(filterApplications(list, { ...none, search: "  ACME " }))).toEqual(["Acme Corp", "Globex"]);
  });

  it("filters nothing for a search of only spaces", () => {
    expect(filterApplications(list, { ...none, search: "   " })).toEqual(list);
  });

  it("matches special characters as plain text", () => {
    expect(names(filterApplications(list, { ...none, search: "c++" }))).toEqual(["Initech"]);
    expect(names(filterApplications(list, { ...none, search: "(" }))).toEqual(["Initech"]);
  });

  it("keeps rows in any of the chosen stages (AC-7)", () => {
    expect(names(filterApplications(list, { ...none, stages: ["offer", "applied"] }))).toEqual(["Acme Corp", "Globex", "Initech"]);
    expect(names(filterApplications(list, { ...none, stages: ["offer"] }))).toEqual(["Globex"]);
  });

  it("filters by work mode and employment type, hiding rows that have none (AC-8)", () => {
    expect(names(filterApplications(list, { ...none, workModes: ["remote", "onsite"] }))).toEqual(["Acme Corp", "Globex"]);
    expect(names(filterApplications(list, { ...none, employmentTypes: ["contract"] }))).toEqual(["Globex"]);
  });

  it("requires the search and every filter to match (AC-9)", () => {
    const query: TableQuery = { search: "acme", stages: ["applied"], workModes: ["remote"], employmentTypes: ["full_time"], archived: false, sort: null };
    expect(names(filterApplications(list, query))).toEqual(["Acme Corp"]);
    expect(filterApplications(list, { ...none, search: "acme", stages: ["applied"], workModes: ["onsite"] })).toEqual([]);
  });
});

describe("sortApplications (spec 012, AC-5, AC-11, AC-12)", () => {
  it("defaults to stage order, keeping the given order inside a stage (AC-5)", () => {
    const list = [
      application({ companyName: "R1", jobTitle: "x", stage: "rejected" }),
      application({ companyName: "A1", jobTitle: "x", stage: "applied" }),
      application({ companyName: "W1", jobTitle: "x", stage: "wishlist" }),
      application({ companyName: "A2", jobTitle: "x", stage: "applied" }),
    ];
    expect(names(sortApplications(list, null, NOW))).toEqual(["W1", "A1", "A2", "R1"]);
  });

  function sorted(list: Application[], column: SortColumn, direction: "asc" | "desc" = "asc") {
    return names(sortApplications(list, { column, direction }, NOW));
  }

  it("sorts text columns alphabetically, ignoring capitals", () => {
    const list = [
      application({ companyName: "beta", jobTitle: "Zed", location: "austin" }),
      application({ companyName: "Alpha", jobTitle: "apple", location: "Boston" }),
      application({ companyName: "Gamma", jobTitle: "Mango", location: "Chicago" }),
    ];
    expect(sorted(list, "company")).toEqual(["Alpha", "beta", "Gamma"]);
    expect(sorted(list, "title")).toEqual(["Alpha", "Gamma", "beta"]);
    expect(sorted(list, "location")).toEqual(["beta", "Alpha", "Gamma"]);
    expect(sorted(list, "company", "desc")).toEqual(["Gamma", "beta", "Alpha"]);
  });

  it("sorts stage in board order", () => {
    const list = [
      application({ companyName: "O", jobTitle: "x", stage: "offer" }),
      application({ companyName: "W", jobTitle: "x", stage: "wishlist" }),
    ];
    expect(sorted(list, "stage")).toEqual(["W", "O"]);
    expect(sorted(list, "stage", "desc")).toEqual(["O", "W"]);
  });

  it("sorts work mode and employment type by their names", () => {
    const list = [
      application({ companyName: "R", jobTitle: "x", workMode: "remote", employmentType: "part_time" }),
      application({ companyName: "H", jobTitle: "x", workMode: "hybrid", employmentType: "full_time" }),
      application({ companyName: "O", jobTitle: "x", workMode: "onsite", employmentType: "contract" }),
    ];
    expect(sorted(list, "mode")).toEqual(["H", "O", "R"]);
    expect(sorted(list, "type")).toEqual(["O", "H", "R"]);
  });

  it("sorts pay by the lowest amount, with hourly pay as yearly pay", () => {
    const list = [
      application({ companyName: "Annual90", jobTitle: "x", salaryMin: 90000, salaryMax: 120000, salaryPeriod: "annual" }),
      application({ companyName: "Hourly50", jobTitle: "x", salaryMin: 50, salaryMax: 60, salaryPeriod: "hourly" }),
      application({ companyName: "MaxOnly80", jobTitle: "x", salaryMax: 80000, salaryPeriod: "annual" }),
      application({ companyName: "Hourly30", jobTitle: "x", salaryMin: 30, salaryPeriod: "hourly" }),
    ];
    // $50/hr is $104,000 a year, and $30/hr is $62,400.
    expect(sorted(list, "pay")).toEqual(["Hourly30", "MaxOnly80", "Annual90", "Hourly50"]);
  });

  it("sorts next step by due date first, then by text", () => {
    const list = [
      application({ companyName: "TextB", jobTitle: "x", nextStep: "Zebra call" }),
      application({ companyName: "Late", jobTitle: "x", nextStep: "zzz", nextStepDue: "2026-11-01" }),
      application({ companyName: "TextA", jobTitle: "x", nextStep: "apply" }),
      application({ companyName: "Early", jobTitle: "x", nextStepDue: "2026-10-05" }),
    ];
    expect(sorted(list, "next")).toEqual(["Early", "Late", "TextA", "TextB"]);
  });

  it("sorts time in stage by days", () => {
    const list = [
      application({ companyName: "Old", jobTitle: "x", stageChangedAt: new Date(2026, 8, 1, 12).toISOString() }),
      application({ companyName: "New", jobTitle: "x", stageChangedAt: new Date(2026, 9, 9, 12).toISOString() }),
      application({ companyName: "Mid", jobTitle: "x", stageChangedAt: new Date(2026, 9, 1, 12).toISOString() }),
    ];
    expect(sorted(list, "age")).toEqual(["New", "Mid", "Old"]);
    expect(sorted(list, "age", "desc")).toEqual(["Old", "Mid", "New"]);
  });

  it("puts empty values last, in either direction", () => {
    const list = [
      application({ companyName: "None", jobTitle: "x" }),
      application({ companyName: "Boston", jobTitle: "x", location: "Boston" }),
      application({ companyName: "Austin", jobTitle: "x", location: "Austin" }),
    ];
    expect(sorted(list, "location")).toEqual(["Austin", "Boston", "None"]);
    expect(sorted(list, "location", "desc")).toEqual(["Boston", "Austin", "None"]);
  });

  it("keeps ties in the default order, in either direction", () => {
    const list = [
      application({ companyName: "B-wish", jobTitle: "x", stage: "wishlist", location: "Austin" }),
      application({ companyName: "A-applied", jobTitle: "x", stage: "applied", location: "Austin" }),
      application({ companyName: "C-applied", jobTitle: "x", stage: "applied", location: "Austin" }),
    ];
    expect(sorted(list, "location")).toEqual(["B-wish", "A-applied", "C-applied"]);
    expect(sorted(list, "location", "desc")).toEqual(["B-wish", "A-applied", "C-applied"]);
  });

  it("does not change the list it is given", () => {
    const list = [application({ companyName: "B", jobTitle: "x", stage: "offer" }), application({ companyName: "A", jobTitle: "x", stage: "applied" })];
    const copy = [...list];
    sortApplications(list, null, NOW);
    expect(list).toEqual(copy);
  });
});
