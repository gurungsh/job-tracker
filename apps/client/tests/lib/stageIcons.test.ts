import { STAGES } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import { STAGE_ICONS } from "../../src/lib/stageIcons.ts";

describe("STAGE_ICONS (spec 011, AC-1)", () => {
  it("has an icon for every stage", () => {
    for (const stage of STAGES) expect(STAGE_ICONS[stage]).toBeDefined();
  });

  it("gives every stage its own icon", () => {
    expect(new Set(STAGES.map((stage) => STAGE_ICONS[stage])).size).toBe(STAGES.length);
  });
});
