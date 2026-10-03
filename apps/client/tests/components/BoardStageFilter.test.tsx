import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STAGE_LABELS, STAGES } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import { BOARD_STAGES_KEY } from "../../src/lib/useBoardStages.ts";
import { application, installFakeServer } from "../support/fakeServer.ts";
import { AppAt } from "../support/render.tsx";

async function openFilter() {
  await userEvent.click(await screen.findByRole("button", { name: /^Stages/ }));
  return screen.getByRole("group", { name: "Stages" });
}

const shownColumns = () => screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));

describe("Board stage filter (spec 018)", () => {
  it("lists all eight stages, checked for the ones the board shows (AC-2)", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" })]);
    render(<AppAt />);

    const list = await openFilter();

    const boxes = within(list).getAllByRole("checkbox");
    expect(boxes.map((box) => (box as HTMLInputElement).labels?.[0]?.textContent.trim())).toEqual(STAGES.map((s) => STAGE_LABELS[s]));
    expect(boxes.map((box) => (box as HTMLInputElement).checked)).toEqual([true, true, true, true, true, false, false, false]);
  });

  it("shows and hides a column as its box is checked, keeping the order (AC-3)", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" })]);
    render(<AppAt />);
    const list = await openFilter();

    await userEvent.click(within(list).getByRole("checkbox", { name: "Rejected" }));
    await userEvent.click(within(list).getByRole("checkbox", { name: "Applied" }));
    expect(shownColumns()).toEqual(["Wishlist", "Screening", "Interviewing", "Offer", "Rejected"]);

    await userEvent.click(within(list).getByRole("checkbox", { name: "Applied" }));
    expect(shownColumns()).toEqual(["Wishlist", "Applied", "Screening", "Interviewing", "Offer", "Rejected"]);
  });

  it("keeps the last checked stage checked (AC-4)", async () => {
    window.localStorage.setItem(BOARD_STAGES_KEY, JSON.stringify(["offer"]));
    installFakeServer();
    render(<AppAt />);
    const list = await openFilter();

    await userEvent.click(within(list).getByRole("checkbox", { name: "Offer" }));

    expect(within(list).getByRole<HTMLInputElement>("checkbox", { name: "Offer" }).checked).toBe(true);
    expect(shownColumns()).toEqual(["Offer"]);
  });

  it("remembers the choice after a reload (AC-5)", async () => {
    installFakeServer();
    const first = render(<AppAt />);
    const list = await openFilter();
    await userEvent.click(within(list).getByRole("checkbox", { name: "Withdrawn" }));
    await userEvent.click(within(list).getByRole("checkbox", { name: "Wishlist" }));
    expect(window.localStorage.getItem(BOARD_STAGES_KEY)).toBe('["applied","screening","interviewing","offer","withdrawn"]');
    first.unmount();

    installFakeServer();
    render(<AppAt />);
    await screen.findAllByRole("region");

    expect(shownColumns()).toEqual(["Applied", "Screening", "Interviewing", "Offer", "Withdrawn"]);
  });

  it("shows every stage with Select All, and resets to the default with Deselect All (spec 021, AC-7)", async () => {
    installFakeServer();
    render(<AppAt />);
    const list = await openFilter();

    await userEvent.click(within(list).getByRole("button", { name: "Select All" }));
    expect(shownColumns()).toEqual(STAGES.map((s) => STAGE_LABELS[s]));

    await userEvent.click(within(list).getByRole("button", { name: "Deselect All" }));
    expect(shownColumns()).toEqual(["Wishlist", "Applied", "Screening", "Interviewing", "Offer"]);
    expect(window.localStorage.getItem(BOARD_STAGES_KEY)).toBe('["wishlist","applied","screening","interviewing","offer"]');
    expect(within(list).getByRole("button", { name: "Select All" })).toBeTruthy();
  });
});
