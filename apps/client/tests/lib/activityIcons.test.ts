import { ACTIVITY_TYPES } from "@job-tracker/shared";
import { ArrowRight } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ACTIVITY_ICONS } from "../../src/lib/activityIcons.ts";

describe("ACTIVITY_ICONS (spec 016, AC-8)", () => {
  it("has an icon for every kind of entry", () => {
    for (const type of ACTIVITY_TYPES) expect(ACTIVITY_ICONS[type], type).toBeDefined();
  });

  it("gives every kind its own icon", () => {
    expect(new Set(ACTIVITY_TYPES.map((type) => ACTIVITY_ICONS[type])).size).toBe(ACTIVITY_TYPES.length);
  });

  it("makes a stage change an arrow", () => {
    expect(ACTIVITY_ICONS.stage_change).toBe(ArrowRight);
  });
});
