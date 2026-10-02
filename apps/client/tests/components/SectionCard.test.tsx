import fs from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionCard } from "../../src/components/SectionCard.tsx";

describe("SectionCard (spec 016, AC-1)", () => {
  it("is a region named by its heading", () => {
    render(
      <SectionCard title="Requirements">
        <p>Inside</p>
      </SectionCard>,
    );

    const region = screen.getByRole("region", { name: "Requirements" });
    expect(within(region).getByRole("heading", { level: 3, name: "Requirements" })).toBeTruthy();
    expect(within(region).getByText("Inside")).toBeTruthy();
  });

  it("puts an action in the heading, beside the title", () => {
    render(
      <SectionCard title="Contacts" action={<button type="button">+ Add</button>}>
        <p>Inside</p>
      </SectionCard>,
    );

    const heading = screen.getByRole("heading", { name: "Contacts" });
    const action = screen.getByRole("button", { name: "+ Add" });
    expect(heading.parentElement).toBe(action.parentElement);
    expect(heading.compareDocumentPosition(action)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("gives two cards different names, so each is its own region", () => {
    render(
      <>
        <SectionCard title="Timeline">a</SectionCard>
        <SectionCard title="Details">b</SectionCard>
      </>,
    );

    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-labelledby")).filter(Boolean)).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Timeline" })).not.toBe(screen.getByRole("region", { name: "Details" }));
  });

  it("styles the heading small, uppercase, and muted, in a bordered card", () => {
    const css = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", "SectionCard.css"), "utf8");

    expect(css).toMatch(/\.section-card-header h3\s*{[^}]*text-transform:\s*uppercase[^}]*color:\s*var\(--text-muted\)/);
    expect(css).toMatch(/\.section-card\s*{[^}]*border:\s*1px solid var\(--border\)/);
  });
});
