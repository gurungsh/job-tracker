import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { movedText } from "@job-tracker/shared";
import { applicationToInput } from "../../src/lib/applicationInput.ts";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", "ApplicationDetailPage.css"), "utf8");

const acme = application({
  companyName: "Acme Corp",
  jobTitle: "Staff Engineer",
  workMode: "hybrid",
  employmentType: "contract",
  contractLengthMonths: 6,
});

describe("the detail page's shell (spec 013)", () => {
  it("opens an application from its address, with the company, title, and badges, and a way back to the board (AC-1, AC-10)", async () => {
    installFakeServer([acme]);

    render(<AppAt path={`/applications/${String(acme.id)}`} />);

    expect(await screen.findByRole("heading", { level: 2, name: "Staff Engineer" })).toBeTruthy();
    expect(screen.getByText("Acme Corp")).toBeTruthy();
    expect([...document.querySelectorAll(".detail-header .pill")].map((pill) => pill.textContent)).toEqual(["Hybrid", "Contract · 6 mo"]);
    expect(screen.getByRole("link", { name: "Back to board" }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says Back to table, and goes back to the table with its filters, when opened from there (AC-8, AC-9)", async () => {
    installFakeServer([acme]);

    render(<AppAt entry={{ pathname: `/applications/${String(acme.id)}`, state: { from: "/table?stage=applied&sort=pay" } }} />);

    const back = await screen.findByRole("link", { name: "Back to table" });
    expect(back.getAttribute("href")).toBe("/table?stage=applied&sort=pay");
  });

  it("goes back to the board when the router state isn't a view (AC-9, AC-10)", async () => {
    installFakeServer([acme]);

    render(<AppAt entry={{ pathname: `/applications/${String(acme.id)}`, state: { from: "//elsewhere.example" } }} />);

    expect((await screen.findByRole("link", { name: "Back to board" })).getAttribute("href")).toBe("/");
  });

  it("says the application doesn't exist for a number that isn't there, with a link to the board (AC-11)", async () => {
    installFakeServer([acme]);

    render(<AppAt path="/applications/999" />);

    expect((await screen.findByRole("alert")).textContent).toBe("This application doesn't exist.");
    expect(screen.getByRole("link", { name: "Back to board" }).getAttribute("href")).toBe("/");
  });

  it("says the same for an address whose number isn't valid, without asking the server (AC-11)", async () => {
    const server = installFakeServer([acme]);

    for (const id of ["abc", "1.5", "-1"]) {
      const { unmount } = render(<AppAt path={`/applications/${id}`} />);
      expect((await screen.findByRole("alert")).textContent, id).toBe("This application doesn't exist.");
      unmount();
    }

    expect(server.requests.some((r) => r.path.startsWith("/api/applications/"))).toBe(false);
  });

  it("explains a failed load and loads again on Try again, with the way back still there", async () => {
    const server = installFakeServer([acme]);
    server.setOffline(true);

    render(<AppAt path={`/applications/${String(acme.id)}`} />);

    expect((await screen.findByRole("alert")).textContent).toContain("Can't reach the server");
    expect(screen.getByRole("link", { name: "Back to board" })).toBeTruthy();

    server.setOffline(false);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Staff Engineer" })).toBeTruthy();
  });

  it("still redirects an address that is not a view or an application to the board", async () => {
    installFakeServer([acme]);

    render(<AppAt path="/applications" />);

    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
  });
});

describe("the detail page's sections (spec 013)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const full = application({
    companyName: "Acme Corp",
    jobTitle: "Staff Engineer",
    stage: "screening",
    stageChangedAt: new Date(2026, 9, 8, 10, 0).toISOString(),
    nextStep: "Recruiter call",
    nextStepDue: "2026-10-10",
    appliedOn: "2026-09-25",
    jobLink: "https://acme.example/jobs/1",
    location: "Austin, TX",
    source: "Referral",
    salaryMin: 140000,
    salaryMax: 170000,
    salaryPeriod: "annual",
    jobDescription: "Build things.\n\nSecond paragraph.",
  });

  /** The value shown next to a label in the Details section. */
  function fact(label: string): HTMLElement {
    const details = screen.getByRole("region", { name: "Details" });
    const term = within(details).getByText(label, { selector: "dt" });
    return term.nextElementSibling as HTMLElement;
  }

  it("shows Requirements, Timeline, Job description, Details, and Contacts together, with no tabs (AC-2)", async () => {
    installFakeServer([full]);

    render(<AppAt path={`/applications/${String(full.id)}`} />);

    for (const name of ["Requirements", "Timeline", "Job description", "Details", "Contacts"]) {
      expect(await screen.findByRole("region", { name }), name).toBeTruthy();
    }
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("lists the pay in full, location, source, next step, applied date, and when the stage last changed (spec 016, AC-10)", async () => {
    installFakeServer([full]);

    render(<AppAt path={`/applications/${String(full.id)}`} />);
    await screen.findByRole("region", { name: "Details" });

    expect(fact("Pay").textContent).toBe("$140,000 – $170,000/yr");
    expect(fact("Location").textContent).toBe("Austin, TX");
    expect(fact("Source").textContent).toBe("Referral");
    expect(fact("Next step").textContent).toContain("Recruiter call");
    expect(fact("Applied").textContent).toBe("Sep 25, 2026");
    expect(fact("In stage since").textContent).toBe("Oct 8, 2026, 10:00 AM");
  });

  it("lists the rows in order, and doesn't repeat the stage, which the menu in the header shows (spec 016, AC-10)", async () => {
    installFakeServer([{ ...full, closedOn: "2026-10-11" }]);

    render(<AppAt path={`/applications/${String(full.id)}`} />);
    const details = await screen.findByRole("region", { name: "Details" });

    expect([...details.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual([
      "Pay", "Location", "Source", "Posting", "Next step", "Applied", "In stage since", "Closed",
    ]);
    expect(fact("Closed").textContent).toBe("Oct 11, 2026");
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Stage" }).value).toBe("screening");
  });

  it("leaves out the Closed row for an application that isn't closed (spec 016, AC-10)", async () => {
    installFakeServer([full]);

    render(<AppAt path={`/applications/${String(full.id)}`} />);
    const details = await screen.findByRole("region", { name: "Details" });

    expect([...details.querySelectorAll("dt")].map((dt) => dt.textContent)).not.toContain("Closed");
  });

  it("marks a due date in the past Overdue, and not one that is today or later (AC-3)", async () => {
    installFakeServer([full]);
    const { unmount } = render(<AppAt path={`/applications/${String(full.id)}`} />);
    await screen.findByRole("region", { name: "Details" });
    expect(fact("Next step").textContent).toContain("Overdue Oct 10, 2026");
    unmount();

    const today = application({ companyName: "Globex", jobTitle: "Designer", nextStepDue: "2026-10-13" });
    installFakeServer([today]);
    render(<AppAt path={`/applications/${String(today.id)}`} />);
    await screen.findByRole("region", { name: "Details" });
    expect(fact("Next step").textContent).not.toContain("Overdue");
    expect(fact("Next step").textContent).toContain("Oct 13, 2026");
  });

  it("opens a valid job link in a new tab, and writes one that isn't valid as plain text (AC-3)", async () => {
    installFakeServer([full]);
    const { unmount } = render(<AppAt path={`/applications/${String(full.id)}`} />);
    await screen.findByRole("region", { name: "Details" });
    const link = within(fact("Posting")).getByRole("link", { name: /Open posting/ });
    expect(link.getAttribute("href")).toBe("https://acme.example/jobs/1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    unmount();

    const plain = application({ companyName: "Globex", jobTitle: "Designer", jobLink: "javascript:alert(1)" });
    installFakeServer([plain]);
    render(<AppAt path={`/applications/${String(plain.id)}`} />);
    await screen.findByRole("region", { name: "Details" });
    expect(within(fact("Posting")).queryByRole("link")).toBeNull();
    expect(fact("Posting").textContent).toBe("javascript:alert(1)");
  });

  it("shows – for every value that was never entered (AC-3)", async () => {
    const bare = application({ companyName: "Globex", jobTitle: "Designer" });
    installFakeServer([bare]);

    render(<AppAt path={`/applications/${String(bare.id)}`} />);
    await screen.findByRole("region", { name: "Details" });

    for (const label of ["Pay", "Location", "Source", "Posting", "Next step", "Applied"]) {
      expect(fact(label).textContent, label).toBe("–");
    }
  });

  it("stacks its sections by the page's own width, not the screen's, because the sidebar takes room (spec 014, AC-12)", () => {
    expect(/\.detail-page\s*{[^}]*container-type:\s*inline-size/.test(css)).toBe(true);
    expect(css).toMatch(/@container \(max-width: 46rem\)/);
    expect(css).not.toMatch(/@media/);
    // The header's controls stay on the title's line however long the title is, until the page is very narrow (spec 016, AC-2).
    expect(/\.detail-header\s*{[^}]*flex-wrap:\s*nowrap/.test(css)).toBe(true);
    expect(/\.detail-heading\s*{[^}]*flex:\s*1 1 0[^}]*min-width:\s*0/.test(css)).toBe(true);
    expect(/\.detail-actions\s*{[^}]*flex-shrink:\s*0/.test(css)).toBe(true);
    expect(/@container \(max-width: 34rem\)\s*{\s*\.detail-header\s*{[^}]*flex-wrap:\s*wrap/.test(css)).toBe(true);
    // Stacked sections fill the page's width, instead of keeping the grid's start alignment.
    expect(/@container[^{]*{[^}]*\.detail-layout\s*{[^}]*align-items:\s*stretch/.test(css)).toBe(true);
  });

  it("shows the description with its line breaks kept, or says none is saved (AC-4)", async () => {
    installFakeServer([full]);
    const { unmount } = render(<AppAt path={`/applications/${String(full.id)}`} />);
    const section = await screen.findByRole("region", { name: "Job description" });
    const text = within(section).getByText(/Build things/);
    expect(text.textContent).toBe("Build things.\n\nSecond paragraph.");
    // Styles are blanked in tests, so check the rule that keeps the line breaks.
    expect(/\.detail-description\s*{[^}]*white-space:\s*pre-wrap/.test(css)).toBe(true);
    unmount();

    const bare = application({ companyName: "Globex", jobTitle: "Designer" });
    installFakeServer([bare]);
    render(<AppAt path={`/applications/${String(bare.id)}`} />);
    const empty = await screen.findByRole("region", { name: "Job description" });
    expect(within(empty).getByText("No description saved.")).toBeTruthy();
  });

  it("shows each section as empty for an application with only a company and a title (edge case)", async () => {
    const bare = application({ companyName: "Globex", jobTitle: "Designer" });
    installFakeServer([bare]);

    render(<AppAt path={`/applications/${String(bare.id)}`} />);

    expect(await screen.findByText("No description saved.")).toBeTruthy();
    expect(await screen.findByText(/Nobody recorded yet/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "Timeline" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Requirements" })).toBeTruthy();
  });
});

describe("changing the stage from the page (spec 013, AC-5)", () => {
  const wishlisted = application({ companyName: "Acme Corp", jobTitle: "Staff Engineer", location: "Austin, TX", nextStep: "Apply" });

  it("fetches the latest, saves only the stage, shows the new stage, and the timeline gets the entry", async () => {
    const server = installFakeServer([wishlisted]);
    render(<AppAt path={`/applications/${String(wishlisted.id)}`} />);
    const menu = await screen.findByRole("combobox", { name: "Stage" });
    expect(within(menu).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Wishlist", "Applied", "Screening", "Interviewing", "Offer", "Accepted", "Rejected", "Withdrawn",
    ]);

    await userEvent.selectOptions(menu, "applied");

    const timeline = screen.getByRole("region", { name: "Timeline" });
    expect(await within(timeline).findByText(movedText("wishlist", "applied"))).toBeTruthy();
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Stage" }).value).toBe("applied");
    const mine = server.requests.filter((r) => r.path === `/api/applications/${String(wishlisted.id)}`);
    expect(mine.map((r) => r.method)).toEqual(["GET", "GET", "PUT"]);
    expect(mine[2]?.body).toEqual(applicationToInput(wishlisted, { stage: "applied" }));
  });

  it("puts the saved stage back and says so when saving fails", async () => {
    const server = installFakeServer([wishlisted]);
    render(<AppAt path={`/applications/${String(wishlisted.id)}`} />);
    const menu = await screen.findByRole("combobox", { name: "Stage" });
    server.override((method) => (method === "PUT" ? new Response(JSON.stringify({ error: "Boom" }), { status: 400 }) : undefined));

    await userEvent.selectOptions(menu, "offer");

    expect((await screen.findByRole("alert")).textContent).toBe("Couldn't change the stage. Boom");
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Stage" }).value).toBe("wishlist");
  });

  it("ends on the last stage chosen after two quick changes", async () => {
    const server = installFakeServer([wishlisted]);
    render(<AppAt path={`/applications/${String(wishlisted.id)}`} />);
    const menu = await screen.findByRole("combobox", { name: "Stage" });

    fireEvent.change(menu, { target: { value: "applied" } });
    fireEvent.change(menu, { target: { value: "screening" } });

    await vi.waitFor(() => {
      expect(server.applications[0]?.stage).toBe("screening");
      expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Stage" }).value).toBe("screening");
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says the application doesn't exist when it was deleted elsewhere", async () => {
    const server = installFakeServer([wishlisted]);
    render(<AppAt path={`/applications/${String(wishlisted.id)}`} />);
    const menu = await screen.findByRole("combobox", { name: "Stage" });
    server.applications.length = 0;

    await userEvent.selectOptions(menu, "applied");

    expect((await screen.findByRole("alert")).textContent).toBe("This application doesn't exist.");
  });
});

describe("editing and deleting from the page (spec 013, AC-6, AC-7, AC-8)", () => {
  function makeApplication() {
    return application({
      companyName: "Acme Corp",
      jobTitle: "Staff Engineer",
      stage: "applied",
      location: "Austin, TX",
      jobDescription: "Build things.",
    });
  }

  it("opens the form in a dialog with the current values, and shows the new ones after saving (AC-6)", async () => {
    const app = makeApplication();
    const server = installFakeServer([app], ["Acme Corp", "Globex"]);
    render(<AppAt path={`/applications/${String(app.id)}`} />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit application" });
    expect(within(dialog).getByLabelText<HTMLInputElement>("Job title").value).toBe("Staff Engineer");
    expect(within(dialog).getByLabelText<HTMLInputElement>("Location").value).toBe("Austin, TX");
    const list = document.getElementById(within(dialog).getByLabelText("Company").getAttribute("list") ?? "");
    expect([...(list?.querySelectorAll("option") ?? [])].map((o) => o.getAttribute("value"))).toEqual(["Acme Corp", "Globex"]);

    await userEvent.clear(within(dialog).getByLabelText("Job title"));
    await userEvent.type(within(dialog).getByLabelText("Job title"), "Principal Engineer");
    await userEvent.clear(within(dialog).getByLabelText("Location"));
    await userEvent.type(within(dialog).getByLabelText("Location"), "Denver, CO");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Principal Engineer" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Details" }).textContent).toContain("Denver, CO");
    expect(server.applications[0]).toMatchObject({ jobTitle: "Principal Engineer", location: "Denver, CO" });
  });

  it("asks before throwing away a changed form, and gives focus back to Edit (AC-6, AC-16)", async () => {
    const app = makeApplication();
    installFakeServer([app]);
    render(<AppAt path={`/applications/${String(app.id)}`} />);
    const edit = await screen.findByRole("button", { name: "Edit" });
    await userEvent.click(edit);
    const dialog = await screen.findByRole("dialog", { name: "Edit application" });
    await userEvent.type(within(dialog).getByLabelText("Job title"), " II");

    await userEvent.keyboard("{Escape}");
    const confirm = screen.getByRole("alertdialog", { name: "Discard changes?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog", { name: "Edit application" })).toBeTruthy();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Staff Engineer" })).toBeTruthy();
    expect(document.activeElement).toBe(edit);
  });

  it("shows the timeline's stage change entry after the stage is changed in the form (AC-6)", async () => {
    const app = makeApplication();
    installFakeServer([app]);
    render(<AppAt path={`/applications/${String(app.id)}`} />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit application" });

    await userEvent.selectOptions(within(dialog).getByLabelText("Stage"), "interviewing");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    const timeline = screen.getByRole("region", { name: "Timeline" });
    expect(await within(timeline).findByText(movedText("applied", "interviewing"))).toBeTruthy();
  });

  it("asks before deleting, naming the job, and deletes nothing on Cancel (AC-7)", async () => {
    const app = makeApplication();
    const server = installFakeServer([app]);
    render(<AppAt path={`/applications/${String(app.id)}`} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    const confirm = screen.getByRole("alertdialog", { name: "Delete application?" });
    expect(confirm.textContent).toContain("Staff Engineer at Acme Corp");
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(server.requests.some((r) => r.method === "DELETE")).toBe(false);
    expect(screen.getByRole("heading", { level: 2, name: "Staff Engineer" })).toBeTruthy();
  });

  it("deletes after confirming and goes back to the table with the same filters (AC-7, AC-8)", async () => {
    const app = makeApplication();
    const other = application({ companyName: "Globex", jobTitle: "Designer", stage: "applied" });
    const server = installFakeServer([app, other]);
    render(<AppAt entry={{ pathname: `/applications/${String(app.id)}`, state: { from: "/table?stage=applied&q=glo" } }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    const search = await screen.findByRole<HTMLInputElement>("searchbox", { name: "Search company or job title" });
    expect(search.value).toBe("glo");
    expect(server.applications).toEqual([other]);
    expect(screen.getByRole("link", { name: "Table" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Designer" })).toBeTruthy();
  });

  it("deletes and goes back to the board when it was opened there (AC-7, AC-9)", async () => {
    const app = makeApplication();
    installFakeServer([app]);
    render(<AppAt entry={{ pathname: `/applications/${String(app.id)}`, state: { from: "/" } }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("region", { name: "Applied" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^(?!Archive|Restore).*Staff Engineer/ })).toBeNull();
  });

  it("stays on the page with an error when deleting fails (AC-7)", async () => {
    const app = makeApplication();
    const server = installFakeServer([app]);
    render(<AppAt path={`/applications/${String(app.id)}`} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    server.setOffline(true);

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't delete. Can't reach the server");
    expect(screen.getByRole("heading", { level: 2, name: "Staff Engineer" })).toBeTruthy();
  });
});

describe("the detail page's header (spec 016, AC-2)", () => {
  const pills = () => [...document.querySelectorAll(".detail-header .pill")].map((pill) => pill.textContent);

  it("shows the avatar and company name, the job title, and the stage menu, Edit, and Delete on the right", async () => {
    const app = application({ companyName: "Acme Corp", jobTitle: "Staff Engineer", stage: "interviewing" });
    installFakeServer([app]);

    render(<AppAt path={`/applications/${String(app.id)}`} />);
    await screen.findByRole("heading", { level: 2, name: "Staff Engineer" });

    expect(document.querySelector(".detail-company .company-avatar")).not.toBeNull();
    expect(document.querySelector(".detail-company")?.textContent).toContain("Acme Corp");
    const actions = document.querySelector(".detail-actions") as HTMLElement;
    expect([...actions.children].map((child) => child.getAttribute("aria-label") ?? child.textContent)).toEqual(["Stage", "Edit", "Archive", "Delete"]);
    expect(within(actions).getByRole<HTMLSelectElement>("combobox", { name: "Stage" }).value).toBe("interviewing");
    expect(within(actions).getByRole("button", { name: "Delete" }).classList.contains("danger")).toBe(true);
  });

  it.each([
    ["both", { workMode: "remote", employmentType: "full_time" }, ["Remote", "Full-time"]],
    ["only the work mode", { workMode: "onsite" }, ["Onsite"]],
    ["only the employment type", { employmentType: "contract", contractLengthMonths: 3 }, ["Contract · 3 mo"]],
    ["neither", {}, []],
  ] as const)("shows a pill for each of the work mode and employment type that is set: %s", async (_name, fields, expected) => {
    const app = application({ companyName: "Acme Corp", jobTitle: "Engineer", ...fields });
    installFakeServer([app]);

    render(<AppAt path={`/applications/${String(app.id)}`} />);
    await screen.findByRole("heading", { level: 2, name: "Engineer" });

    expect(pills()).toEqual(expected);
    if (expected.length === 0) expect(document.querySelector(".detail-pills")).toBeNull();
  });
});

