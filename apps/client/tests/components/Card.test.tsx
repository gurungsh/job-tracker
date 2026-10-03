import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Card } from "../../src/components/Card.tsx";
import { application } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderCard(fields: Parameters<typeof application>[0], handlers: { onOpen?: () => void; onArchive?: () => void } = {}) {
  const app = application(fields);
  const { container } = render(
    <Card
      application={app}
      today="2026-10-13"
      onOpen={handlers.onOpen ?? (() => undefined)}
      onArchive={handlers.onArchive ?? (() => undefined)}
      onMove={() => undefined}
      dragging={false}
      draggable
      onDragStart={() => undefined}
      onDragEnd={() => undefined}
    />,
  );
  return { card: container.querySelector<HTMLElement>(".card") as HTMLElement, container };
}

describe("Card", () => {
  it("shows the company's initials badge, then its name, and the title (AC-3)", () => {
    const { card } = renderCard({ companyName: "Bank of America", jobTitle: "Engineer" });

    const header = card.querySelector(".card-header");
    expect(header?.children[0]?.textContent).toBe("BA");
    expect(header?.children[0]?.getAttribute("aria-hidden")).toBe("true");
    expect(header?.children[1]?.textContent).toBe("Bank of America");
    expect(card.querySelector(".card-title")?.textContent).toBe("Engineer");
  });

  it("is still named by the company and title alone, so the badge doesn't change its name (AC-3)", () => {
    renderCard({ companyName: "Acme Corp", jobTitle: "Engineer" });

    expect(screen.getByRole("button", { name: /^Acme Corp\s*Engineer/ })).toBeTruthy();
  });

  it("shows location, work mode, and employment type on one line (AC-6)", () => {
    const { card } = renderCard({
      companyName: "Acme",
      jobTitle: "Engineer",
      location: "Charlotte, NC",
      workMode: "hybrid",
      employmentType: "contract",
      contractLengthMonths: 6,
    });

    expect(card.querySelector(".card-details")?.textContent).toBe("Charlotte, NC • Hybrid • Contract · 6 mo");
  });

  it("has no details line and no pay line when there is nothing to show (AC-6, AC-7)", () => {
    const { card } = renderCard({ companyName: "Acme", jobTitle: "Engineer" });

    expect(card.querySelector(".card-details")).toBeNull();
    expect(card.querySelector(".card-pay")).toBeNull();
  });

  it("shows the pay in the short form (AC-7)", () => {
    const { card } = renderCard({
      companyName: "Acme",
      jobTitle: "Engineer",
      salaryMin: 85,
      salaryMax: 95,
      salaryPeriod: "hourly",
    });

    expect(card.querySelector(".card-pay")?.textContent).toBe("$85–$95/hr");
  });

  it("shows the next step and due date, and marks an overdue one (AC-8)", () => {
    const { card } = renderCard({
      companyName: "Acme",
      jobTitle: "Engineer",
      nextStep: "Send portfolio",
      nextStepDue: "2026-10-01",
    });

    expect(card.textContent).toContain("Send portfolio");
    expect(card.textContent).toContain("Oct 1, 2026");
    expect(within(card).getByText("Overdue")).toBeTruthy();
  });

  it("doesn't repeat the stage on the card, and shows only the time in stage in its footer (AC-2, AC-9)", () => {
    const { card } = renderCard({
      companyName: "Acme",
      jobTitle: "Engineer",
      stage: "interviewing",
      stageChangedAt: new Date(2026, 9, 8, 15, 0).toISOString(),
    });

    expect(card.querySelector(".stage-badge")).toBeNull();
    expect(within(card).queryByText("Interviewing")).toBeNull();
    const footer = card.querySelector(".card-footer");
    expect(footer?.children).toHaveLength(1);
    const age = card.querySelector(".card-age");
    expect(age?.textContent.trim()).toBe("5 days");
    expect(age?.getAttribute("title")).toBe("Time in this stage");
    expect(age?.querySelector("svg")).toBeTruthy();
  });

  it.each([
    [new Date(2026, 9, 13, 8, 0), "Today"],
    [new Date(2026, 9, 12, 23, 0), "1 day"],
    [new Date(2026, 8, 13, 9, 0), "30 days"],
  ])("says a stage changed at %s was %j ago (AC-9)", (changedAt, text) => {
    const { card } = renderCard({ companyName: "Acme", jobTitle: "Engineer", stageChangedAt: changedAt.toISOString() });

    expect(card.querySelector(".card-age")?.textContent.trim()).toBe(text);
  });

  it("still opens when clicked (AC-10)", () => {
    const onOpen = vi.fn();
    const { card } = renderCard({ companyName: "Acme", jobTitle: "Engineer" }, { onOpen });

    fireEvent.click(card);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("keeps long text in place by cutting the company and title short (AC-13)", () => {
    const { card } = renderCard({
      companyName: "A very long company name that goes on and on and on and on",
      jobTitle: "A very long job title that also goes on and on and on and on",
      location: "A location with a long description, somewhere far away from everything else",
    });

    // The cutting is done by CSS: these parts carry the classes that clip them.
    expect(card.querySelector(".card-company")).toBeTruthy();
    expect(card.querySelector(".card-title")).toBeTruthy();
    expect(card.querySelector(".card-details")).toBeTruthy();
  });
});

describe("Card drag copy (spec 019, AC-1)", () => {
  function dataTransfer(setDragImage?: (element: Element, x: number, y: number) => void) {
    return { effectAllowed: "", setData: vi.fn(), setDragImage };
  }

  it("hands the browser a styled copy with the card's content, then removes it", async () => {
    const { card } = renderCard({ companyName: "Acme", jobTitle: "Staff Engineer" });
    let copy: Element | undefined;
    const setDragImage = vi.fn((element: Element) => {
      copy = element;
      expect(document.body.contains(element)).toBe(true);
    });

    fireEvent.dragStart(card, { dataTransfer: dataTransfer(setDragImage), clientX: 5, clientY: 7 });

    expect(setDragImage).toHaveBeenCalledTimes(1);
    expect(copy?.classList.contains("card-drag-image")).toBe(true);
    expect(copy?.textContent).toContain("Staff Engineer");
    expect(copy).not.toBe(card);
    await waitFor(() => {
      expect(document.body.contains(copy ?? null)).toBe(false);
    });
  });

  it("still starts the drag where the browser has no setDragImage", () => {
    const onDragStart = vi.fn();
    const app = application({ companyName: "Acme", jobTitle: "Engineer" });
    const { container } = render(
      <Card application={app} today="2026-10-13" onOpen={() => undefined} onArchive={() => undefined} onMove={() => undefined} dragging={false} draggable onDragStart={onDragStart} onDragEnd={() => undefined} />,
    );

    fireEvent.dragStart(container.querySelector(".card") as HTMLElement, { dataTransfer: dataTransfer() });

    expect(onDragStart).toHaveBeenCalledWith(app, expect.any(Number));
  });
});
