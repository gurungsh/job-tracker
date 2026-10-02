import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const screening = application({
  companyName: "Acme Corp",
  jobTitle: "Engineer",
  stage: "screening",
  nextStep: "Recruiter call",
  nextStepDue: "2026-10-15",
  appliedOn: "2026-09-25",
  stageChangedAt: new Date(2026, 9, 1, 10, 0).toISOString(),
});

async function openCard(name: RegExp) {
  await userEvent.click(await screen.findByRole("button", { name }));
  return screen.getByRole("dialog", { name: "Edit application" });
}

describe("editing an application", () => {
  it("opens the side panel with every field, the dates, and the days in stage (AC-9, AC-22)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);

    const panel = await openCard(/Acme Corp/);

    expect(within(panel).getByLabelText<HTMLInputElement>("Company").value).toBe("Acme Corp");
    expect(within(panel).getByLabelText<HTMLInputElement>("Job title").value).toBe("Engineer");
    expect(within(panel).getByLabelText<HTMLSelectElement>("Stage").value).toBe("screening");
    expect(within(panel).getByLabelText<HTMLTextAreaElement>("Next step").value).toBe("Recruiter call");
    expect(within(panel).getByLabelText<HTMLInputElement>("Next step due date").value).toBe("2026-10-15");
    expect(within(panel).getByLabelText<HTMLInputElement>("Applied date").value).toBe("2026-09-25");
    expect(within(panel).getByText("In Screening for 12 days")).toBeTruthy();
    expect(within(panel).getByText("Stage changed Oct 1, 2026")).toBeTruthy();
  });

  it("shows the closed date for a closed application", async () => {
    installFakeServer([
      application({ companyName: "Globex", jobTitle: "Designer", stage: "rejected", closedOn: "2026-10-10" }),
    ]);
    render(<AppAt />);

    const panel = await openCard(/Globex/);

    expect(within(panel).getByText("Closed Oct 10, 2026")).toBeTruthy();
  });

  it("saves edits and updates the card (AC-10)", async () => {
    const server = installFakeServer([screening]);
    render(<AppAt />);
    const panel = await openCard(/Acme Corp/);

    const title = within(panel).getByLabelText("Job title");
    await userEvent.clear(title);
    await userEvent.type(title, "Staff Engineer");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("button", { name: /Staff Engineer/ })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(server.requests.find((r) => r.method === "PUT")).toMatchObject({
      path: `/api/applications/${String(screening.id)}`,
      body: expect.objectContaining({ jobTitle: "Staff Engineer", stage: "screening" }) as unknown,
    });
  });

  it("moves the card when the stage changes (AC-12)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);
    const panel = await openCard(/Acme Corp/);

    await userEvent.selectOptions(within(panel).getByLabelText("Stage"), "Interviewing");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    const interviewing = screen.getByRole("region", { name: "Interviewing" });
    expect(await within(interviewing).findByRole("button", { name: /Acme Corp/ })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Screening" })).queryByRole("button")).toBeNull();
  });
});

describe("closing the side panel", () => {
  it("closes right away when nothing changed", async () => {
    installFakeServer([screening]);
    render(<AppAt />);
    const panel = await openCard(/Acme Corp/);

    await userEvent.click(within(panel).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before throwing away unsaved changes (AC-11)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);
    const panel = await openCard(/Acme Corp/);
    await userEvent.type(within(panel).getByLabelText("Job title"), " II");

    await userEvent.click(within(panel).getByRole("button", { name: "Close" }));
    const confirm = screen.getByRole("alertdialog", { name: "Discard changes?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("dialog", { name: "Edit application" })).toBeTruthy();
    expect(within(panel).getByLabelText<HTMLInputElement>("Job title").value).toBe("Engineer II");

    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before closing an add form that has input", async () => {
    installFakeServer();
    render(<AppAt />);
    await userEvent.click(await screen.findByRole("button", { name: "Add application" }));
    await userEvent.type(screen.getByLabelText("Company"), "Acme");

    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("alertdialog", { name: "Discard changes?" })).toBeTruthy();
  });
});

describe("deleting an application", () => {
  it("asks first, naming the job title and company, and does nothing on cancel (AC-16)", async () => {
    const server = installFakeServer([screening]);
    render(<AppAt />);
    const panel = await openCard(/Acme Corp/);

    await userEvent.click(within(panel).getByRole("button", { name: "Delete" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete application?" });
    expect(confirm.textContent).toContain("Delete Engineer at Acme Corp? This can't be undone.");
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("dialog", { name: "Edit application" })).toBeTruthy();
    expect(server.requests.some((r) => r.method === "DELETE")).toBe(false);
  });

  it("removes the card after confirming (AC-16)", async () => {
    const server = installFakeServer([screening]);
    render(<AppAt />);
    const panel = await openCard(/Acme Corp/);

    await userEvent.click(within(panel).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No applications yet. Add your first one to get started.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(server.requests.find((r) => r.method === "DELETE")?.path).toBe(`/api/applications/${String(screening.id)}`);
  });

  it("isn't offered when adding", async () => {
    installFakeServer();
    render(<AppAt />);

    await userEvent.click(await screen.findByRole("button", { name: "Add application" }));

    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("keeps the panel open with an error when deleting fails", async () => {
    const server = installFakeServer([screening]);
    render(<AppAt />);
    const panel = await openCard(/Acme Corp/);

    server.setOffline(true);
    await userEvent.click(within(panel).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect((await within(panel).findByRole("alert")).textContent).toContain("Couldn't delete");
    expect(screen.getByRole("dialog", { name: "Edit application" })).toBeTruthy();
  });
});
