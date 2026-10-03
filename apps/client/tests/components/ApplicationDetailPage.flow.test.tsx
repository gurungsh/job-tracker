import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { movedText } from "@job-tracker/shared";
import { MemoryRouter, useNavigate } from "react-router";
import { App } from "../../src/App.tsx";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";
import { showAllStages } from "../support/stages.ts";

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

/** From the board: click the card to open the page, then Edit to open the form (spec 013, AC-1, AC-6). */
async function openEditFromBoard(name: RegExp) {
  await userEvent.click(await screen.findByRole("button", { name: (accessible) => name.test(accessible) && !/^(Archive|Restore|Move):/.test(accessible) }));
  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  return screen.findByRole("dialog", { name: "Edit application" });
}

describe("opening an application from the board and editing it (spec 013)", () => {
  it("opens the page from a card, with no dialog or side panel (AC-1)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);

    await userEvent.click(await screen.findByRole("button", { name: /^(?!Archive|Restore|Move).*Acme Corp/ }));

    expect(await screen.findByRole("heading", { level: 2, name: "Engineer" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("aside")).toBeNull();
  });

  it("fills the form with every field (AC-6)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);

    const dialog = await openEditFromBoard(/Acme Corp/);

    expect(within(dialog).getByLabelText<HTMLInputElement>("Company").value).toBe("Acme Corp");
    expect(within(dialog).getByLabelText<HTMLInputElement>("Job title").value).toBe("Engineer");
    expect(within(dialog).getByLabelText<HTMLSelectElement>("Stage").value).toBe("screening");
    expect(within(dialog).getByLabelText<HTMLTextAreaElement>("Next step").value).toBe("Recruiter call");
    expect(within(dialog).getByLabelText<HTMLInputElement>("Next step due date").value).toBe("2026-10-15");
    expect(within(dialog).getByLabelText<HTMLInputElement>("Applied date").value).toBe("2026-09-25");
  });

  it("shows the closed date of a closed application on its page (AC-3)", async () => {
    showAllStages();
    installFakeServer([application({ companyName: "Globex", jobTitle: "Designer", stage: "rejected", closedOn: "2026-10-10" })]);
    render(<AppAt />);

    await userEvent.click(await screen.findByRole("button", { name: /^(?!Archive|Restore|Move).*Globex/ }));

    const details = await screen.findByRole("region", { name: "Details" });
    expect(within(details).getByText("Oct 10, 2026")).toBeTruthy();
  });

  it("saves edits, and the card on the board shows them after going back (AC-6, AC-8)", async () => {
    const server = installFakeServer([screening]);
    render(<AppAt />);
    const dialog = await openEditFromBoard(/Acme Corp/);

    const title = within(dialog).getByLabelText("Job title");
    await userEvent.clear(title);
    await userEvent.type(title, "Staff Engineer");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Staff Engineer" })).toBeTruthy();
    await userEvent.click(screen.getByRole("link", { name: "Back to board" }));

    expect(await screen.findByRole("button", { name: /^(?!Archive|Restore|Move).*Staff Engineer/ })).toBeTruthy();
    expect(server.requests.find((r) => r.method === "PUT")).toMatchObject({
      path: `/api/applications/${String(screening.id)}`,
      body: expect.objectContaining({ jobTitle: "Staff Engineer", stage: "screening" }) as unknown,
    });
  });

  it("moves the card to the new column when the stage is changed in the form (AC-6, AC-8)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);
    const dialog = await openEditFromBoard(/Acme Corp/);

    await userEvent.selectOptions(within(dialog).getByLabelText("Stage"), "Interviewing");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await userEvent.click(await screen.findByRole("link", { name: "Back to board" }));

    const interviewing = await screen.findByRole("region", { name: "Interviewing" });
    expect(await within(interviewing).findByRole("button", { name: /^(?!Archive|Restore|Move).*Acme Corp/ })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Screening" })).queryByRole("button")).toBeNull();
  });

  it("closes the form right away when nothing changed (AC-6)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);
    const dialog = await openEditFromBoard(/Acme Corp/);

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("deletes from the page and the card is gone from the board (AC-7, AC-9)", async () => {
    installFakeServer([screening]);
    render(<AppAt />);
    await userEvent.click(await screen.findByRole("button", { name: /^(?!Archive|Restore|Move).*Acme Corp/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("region", { name: "Screening" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^(?!Archive|Restore|Move).*Acme Corp/ })).toBeNull();
  });

  it("goes back with the browser's Back button to the board or the table with its filters (AC-8, AC-9)", async () => {
    const other = application({ companyName: "Globex", jobTitle: "Designer", stage: "screening" });
    installFakeServer([screening, other]);
    function BrowserBack() {
      const navigate = useNavigate();
      return (
        <button
          type="button"
          onClick={() => {
            void navigate(-1);
          }}
        >
          Browser back
        </button>
      );
    }
    render(
      <MemoryRouter
        initialEntries={[
          "/table?q=acme&stage=screening",
          { pathname: `/applications/${String(screening.id)}`, state: { from: "/table?q=acme&stage=screening" } },
        ]}
        initialIndex={1}
      >
        <App />
        <BrowserBack />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { level: 2, name: "Engineer" });

    await userEvent.click(screen.getByRole("button", { name: "Browser back" }));

    const search = await screen.findByRole<HTMLInputElement>("searchbox", { name: "Search company or job title" });
    expect(search.value).toBe("acme");
    expect(screen.getByRole("button", { name: "Engineer" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Designer" })).toBeNull();
  });
});

describe("working with the sections on the page (spec 013, AC-12, AC-16)", () => {
  const page = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

  it("adds a timeline entry, a contact, and a requirement, each saving right away (AC-12)", async () => {
    const server = installFakeServer([page]);
    render(<AppAt path={`/applications/${String(page.id)}`} />);
    const timeline = within(await screen.findByRole("region", { name: "Timeline" }));
    const contacts = within(screen.getByRole("region", { name: "Contacts" }));
    const requirements = within(screen.getByRole("region", { name: "Requirements" }));

    const entryForm = within(await screen.findByRole("form", { name: "Add entry" }));
    await userEvent.type(entryForm.getByLabelText("What happened"), "Phone screen went well");
    await userEvent.click(entryForm.getByRole("button", { name: "Log note" }));
    expect(await timeline.findByText("Phone screen went well")).toBeTruthy();

    await userEvent.click(await contacts.findByRole("button", { name: "Add contact" }));
    const contactForm = within(await contacts.findByRole("form", { name: "Add contact" }));
    await userEvent.type(contactForm.getByLabelText("Name"), "Sam Recruiter");
    await userEvent.click(contactForm.getByRole("button", { name: "Save" }));
    expect(await contacts.findByText("Sam Recruiter")).toBeTruthy();

    await userEvent.click(await requirements.findByRole("button", { name: "Add requirement" }));
    const requirementForm = within(await requirements.findByRole("form", { name: "Add requirement" }));
    await userEvent.type(requirementForm.getByLabelText("Text"), "5 years of TypeScript");
    await userEvent.click(requirementForm.getByRole("button", { name: "Save" }));
    expect(await requirements.findByText("5 years of TypeScript")).toBeTruthy();
    expect(requirements.getByText("0/1 required met")).toBeTruthy();

    expect(server.activities.some((a) => a.text === "Phone screen went well")).toBe(true);
    expect(server.contacts.map((c) => c.name)).toEqual(["Sam Recruiter"]);
    expect(server.requirements.map((r) => r.text)).toEqual(["5 years of TypeScript"]);
  });

  it("offers a contact added on the page when logging a timeline entry, without a reload (AC-12)", async () => {
    installFakeServer([page]);
    render(<AppAt path={`/applications/${String(page.id)}`} />);
    const contacts = within(await screen.findByRole("region", { name: "Contacts" }));
    await userEvent.click(await contacts.findByRole("button", { name: "Add contact" }));
    const contactForm = within(await contacts.findByRole("form", { name: "Add contact" }));

    await userEvent.type(contactForm.getByLabelText("Name"), "Sam Recruiter");
    await userEvent.click(contactForm.getByRole("button", { name: "Save" }));

    const entryForm = within(await screen.findByRole("form", { name: "Add entry" }));
    expect(await entryForm.findByRole("option", { name: "Sam Recruiter" })).toBeTruthy();
  });

  it("reaches the link back, the stage menu, Edit, Delete, and each section's controls with Tab (AC-16)", async () => {
    installFakeServer([page]);
    render(<AppAt path={`/applications/${String(page.id)}`} />);
    await screen.findByRole("button", { name: "Add contact" });
    await screen.findByRole("form", { name: "Add entry" });
    await screen.findByRole("button", { name: "Add requirement" });

    const reached = new Set<Element>();
    for (let i = 0; i < 60; i += 1) {
      await userEvent.tab();
      reached.add(document.activeElement as Element);
    }

    for (const control of [
      screen.getByRole("link", { name: "Back to board" }),
      screen.getByRole("combobox", { name: "Stage" }),
      screen.getByRole("button", { name: "Edit" }),
      screen.getByRole("button", { name: "Delete" }),
      screen.getByRole("button", { name: "Add requirement" }),
      within(screen.getByRole("form", { name: "Add entry" })).getByLabelText("What happened"),
      screen.getByRole("button", { name: "Add contact" }),
    ]) {
      expect(reached.has(control), control.outerHTML.slice(0, 60)).toBe(true);
    }
  });

  it("opens Edit and Delete with Enter and Space (AC-16)", async () => {
    installFakeServer([page]);
    render(<AppAt path={`/applications/${String(page.id)}`} />);
    const edit = await screen.findByRole("button", { name: "Edit" });

    edit.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Edit application" })).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    screen.getByRole("button", { name: "Delete" }).focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("alertdialog", { name: "Delete application?" })).toBeTruthy();
  });
});

describe("a half-typed timeline entry (spec 013, AC-5, AC-12)", () => {
  const page = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

  it("is kept when I add a contact, and the new contact can be chosen for it", async () => {
    installFakeServer([page]);
    render(<AppAt path={`/applications/${String(page.id)}`} />);
    const entryForm = within(await screen.findByRole("form", { name: "Add entry" }));
    await userEvent.type(entryForm.getByLabelText("What happened"), "Call with the recruiter");

    const contacts = within(screen.getByRole("region", { name: "Contacts" }));
    await userEvent.click(await contacts.findByRole("button", { name: "Add contact" }));
    await userEvent.type(await contacts.findByLabelText("Name"), "Sam Recruiter");
    await userEvent.click(contacts.getByRole("button", { name: "Save" }));

    expect(await entryForm.findByRole("option", { name: "Sam Recruiter" })).toBeTruthy();
    expect(entryForm.getByLabelText<HTMLTextAreaElement>("What happened").value).toBe("Call with the recruiter");
  });

  it("is kept when I change the stage", async () => {
    installFakeServer([page]);
    render(<AppAt path={`/applications/${String(page.id)}`} />);
    const entryForm = within(await screen.findByRole("form", { name: "Add entry" }));
    await userEvent.type(entryForm.getByLabelText("What happened"), "Thinking about next steps");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "screening");

    const timeline = within(screen.getByRole("region", { name: "Timeline" }));
    expect(await timeline.findByText(movedText("applied", "screening"))).toBeTruthy();
    expect(entryForm.getByLabelText<HTMLTextAreaElement>("What happened").value).toBe("Thinking about next steps");
  });
});
