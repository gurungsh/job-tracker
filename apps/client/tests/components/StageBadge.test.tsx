import { STAGE_LABELS, STAGES } from "@job-tracker/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StageBadge } from "../../src/components/StageBadge.tsx";

describe("StageBadge (spec 011, AC-2)", () => {
  it.each(STAGES)("shows the %s name and carries its stage for the colors", (stage) => {
    render(<StageBadge stage={stage} />);

    const badge = screen.getByText(STAGE_LABELS[stage]);
    expect(badge.getAttribute("data-stage")).toBe(stage);
  });
});
