import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { App } from "../../src/App.tsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { application, installFakeServer } from "../support/fakeServer.ts";
import { AppAt } from "../support/render.tsx";

beforeEach(() => {
  // Freeze "today" at Oct. 10, 2026, without freezing timers the UI relies on.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 10, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

async function openTable(path = "/table") {
  render(<AppAt path={path} />);
  return await screen.findByRole("table");
}

function bodyRows() {
  return screen.queryAllByRole("row").slice(1);
}

function cells(row: HTMLElement) {
  return within(row).getAllByRole("cell");
}

describe("TableView rows and columns (spec 012, AC-3, AC-4, AC-5)", () => {
  it("shows one row per application, with the columns in order (AC-3)", async () => {
    installFakeServer([
      application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" }),
      application({ companyName: "Globex", jobTitle: "Designer", stage: "offer" }),
    ]);

    await openTable();

    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Company",
      "Job title",
      "Stage",
      "Location",
      "Work mode",
      "Employment type",
      "Pay",
      "Next step",
      "Time in stage",
      "Actions",
    ]);
    expect(bodyRows()).toHaveLength(2);
  });

  it("writes each cell as a card does, with – for empty values (AC-4)", async () => {
    installFakeServer([
      application({
        companyName: "Acme",
        jobTitle: "Engineer",
        stage: "interviewing",
        location: "Charlotte, NC",
        workMode: "hybrid",
        employmentType: "contract",
        contractLengthMonths: 6,
        salaryMin: 140000,
        salaryMax: 170000,
        salaryPeriod: "annual",
        nextStep: "Phone screen",
        nextStepDue: "2026-10-05",
        stageChangedAt: new Date(2026, 9, 5, 12).toISOString(),
      }),
      application({ companyName: "Bare", jobTitle: "Analyst", stage: "wishlist", stageChangedAt: new Date(2026, 9, 10, 8).toISOString() }),
    ]);

    await openTable();

    const [bare, acme] = bodyRows().map(cells);
    // Stage order puts Wishlist first.
    expect(bare?.map((cell) => cell.textContent.trim())).toEqual(["Bare", "Analyst", "Wishlist", "–", "–", "–", "–", "–", "Today", ""]);
    expect(acme?.map((cell) => cell.textContent.trim())).toEqual([
      "Acme",
      "Engineer",
      "Interviewing",
      "Charlotte, NC",
      "Hybrid",
      "Contract · 6 mo",
      "$140k–$170k/yr",
      "Phone screenOverdue Oct 5, 2026",
      "5 days",
      "",
    ]);
    expect(acme?.[2]?.querySelector("[data-stage='interviewing']")).toBeTruthy();
  });

  it("does not mark a due date overdue until it has passed", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", nextStepDue: "2026-10-10" })]);

    await openTable();

    expect(screen.queryByText("Overdue")).toBeNull();
    expect(screen.getByText("Oct 10, 2026")).toBeTruthy();
  });

  it("starts in stage order, keeping board order inside a stage (AC-5)", async () => {
    installFakeServer([
      application({ companyName: "Rejected Co", jobTitle: "x", stage: "rejected" }),
      application({ companyName: "Applied One", jobTitle: "x", stage: "applied" }),
      application({ companyName: "Wishlist Co", jobTitle: "x", stage: "wishlist" }),
      application({ companyName: "Applied Two", jobTitle: "x", stage: "applied" }),
    ]);

    await openTable();

    expect(bodyRows().map((row) => cells(row)[0]?.textContent)).toEqual(["Wishlist Co", "Applied One", "Applied Two", "Rejected Co"]);
  });

  it("says so when there are no applications, with no table (AC-18)", async () => {
    installFakeServer();

    render(<AppAt path="/table" />);

    const message = await screen.findByText("No applications yet. Use the Add application button in the sidebar to add your first one.");
    expect(message.textContent).not.toMatch(/board/i);
    expect(screen.getByRole("button", { name: "Add application" }).closest(".app-sidebar")).not.toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        void navigate(-1);
      }}
    >
      Back
    </button>
  );
}

/** A filter's button, which shares its name with the column heading's sort button. */
function filterButton(name: string) {
  return within(screen.getByRole("group", { name: "Search and filters" })).getByRole("button", { name });
}

function openTableWithAddress(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  );
}

function companies() {
  return bodyRows().map((row) => cells(row)[0]?.textContent);
}

const SAMPLE = () => [
  application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied", workMode: "remote", employmentType: "full_time" }),
  application({ companyName: "Globex", jobTitle: "Acme liaison", stage: "offer", workMode: "onsite", employmentType: "contract" }),
  application({ companyName: "Initech", jobTitle: "C++ Developer", stage: "applied" }),
];

describe("TableView search and filters (spec 012, AC-6 to AC-10, AC-13, AC-14, AC-15, AC-19)", () => {
  it("searches as I type, and keeps the search in the address (AC-6, AC-13)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");

    await user.type(screen.getByRole("searchbox"), "acme");

    expect(companies()).toEqual(["Acme Corp", "Globex"]);
    expect(screen.getByTestId("where").textContent).toBe("/table?q=acme");
    expect(screen.getByRole("status").textContent).toBe("2 of 3");
  });

  it("changes the address without adding history entries, so Back leaves the table (AC-2, AC-13)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/", "/table"]} initialIndex={1}>
        <App />
        <Where />
        <BackButton />
      </MemoryRouter>,
    );
    await screen.findByRole("table");

    await user.type(screen.getByRole("searchbox"), "acme");
    await user.click(filterButton("Stage"));
    await user.click(screen.getByRole("checkbox", { name: "Offer" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByTestId("where").textContent).toBe("/");
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
  });

  it("starts from the address, so a reload or a bookmark shows the same rows (AC-13)", async () => {
    installFakeServer(SAMPLE());
    openTableWithAddress("/table?q=acme&stage=offer&sort=company&dir=desc");

    await screen.findByRole("table");

    expect(screen.getByRole<HTMLInputElement>("searchbox").value).toBe("acme");
    expect(companies()).toEqual(["Globex"]);
  });

  it("filters by stage, work mode, and employment type, and writes them to the address (AC-7, AC-8, AC-13)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");

    await user.click(filterButton("Stage"));
    await user.click(screen.getByRole("checkbox", { name: "Applied" }));
    expect(companies()).toEqual(["Acme Corp", "Initech"]);
    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied");
    await user.click(screen.getByRole("checkbox", { name: "Offer" }));
    expect(companies()).toEqual(["Acme Corp", "Initech", "Globex"]);
    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied&stage=offer");

    await user.click(filterButton("Work mode"));
    await user.click(screen.getByRole("checkbox", { name: "Remote" }));
    // Initech has no work mode, so it is hidden once the filter has a choice.
    expect(companies()).toEqual(["Acme Corp"]);

    await user.click(filterButton("Employment type"));
    await user.click(screen.getByRole("checkbox", { name: "Contract" }));
    expect(companies()).toEqual([]);
    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied&stage=offer&mode=remote&type=contract");
  });

  it("shows how many rows match, and Clear empties the search and filters but keeps the sort (AC-10)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table?sort=company&dir=desc");
    await screen.findByRole("table");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();

    await user.type(screen.getByRole("searchbox"), "acme");
    await user.click(filterButton("Stage"));
    await user.click(screen.getByRole("checkbox", { name: "Offer" }));
    expect(screen.getByRole("status").textContent).toBe("1 of 3");

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(companies()).toEqual(["Initech", "Globex", "Acme Corp"]);
    expect(screen.getByRole<HTMLInputElement>("searchbox").value).toBe("");
    expect(screen.getByTestId("where").textContent).toBe("/table?sort=company&dir=desc");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("says nothing matches, and Clear brings the rows back (AC-19)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");

    await user.type(screen.getByRole("searchbox"), "zzz");

    expect(screen.getByText("No applications match.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(companies()).toHaveLength(3);
  });

  it("ignores values in the address that are not valid, and counts a repeated one once (AC-14)", async () => {
    installFakeServer(SAMPLE());
    openTableWithAddress("/table?stage=nope&stage=offer&stage=offer&sort=bogus&mode=moon");

    await screen.findByRole("table");

    expect(companies()).toEqual(["Globex"]);
    expect(filterButton("Stage 1")).toBeTruthy();
  });

  it("keeps the search and filters when I switch to the board and back (AC-15)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table?q=acme&stage=offer");
    await screen.findByRole("table");

    await user.click(screen.getByRole("link", { name: "Kanban View" }));
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Table View" }));

    expect(await screen.findByRole("table")).toBeTruthy();
    expect(companies()).toEqual(["Globex"]);
    expect(screen.getByRole<HTMLInputElement>("searchbox").value).toBe("acme");
  });
});

describe("TableView sorting (spec 012, AC-11, AC-12, AC-13)", () => {
  function heading(name: string) {
    return screen.getByRole("columnheader", { name: new RegExp(`^${name}`) });
  }

  it("cycles a heading through ascending, descending, and the default order (AC-11)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");
    expect(companies()).toEqual(["Acme Corp", "Initech", "Globex"]);
    expect(heading("Company").getAttribute("aria-sort")).toBeNull();

    await user.click(within(heading("Company")).getByRole("button"));
    expect(companies()).toEqual(["Acme Corp", "Globex", "Initech"]);
    expect(heading("Company").getAttribute("aria-sort")).toBe("ascending");
    expect(heading("Company").textContent).toContain("▲");
    expect(screen.getByTestId("where").textContent).toBe("/table?sort=company&dir=asc");

    await user.click(within(heading("Company")).getByRole("button"));
    expect(companies()).toEqual(["Initech", "Globex", "Acme Corp"]);
    expect(heading("Company").getAttribute("aria-sort")).toBe("descending");
    expect(heading("Company").textContent).toContain("▼");

    await user.click(within(heading("Company")).getByRole("button"));
    expect(companies()).toEqual(["Acme Corp", "Initech", "Globex"]);
    expect(heading("Company").getAttribute("aria-sort")).toBeNull();
    expect(screen.getByTestId("where").textContent).toBe("/table");
  });

  it("sorts one column at a time (AC-11)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");

    await user.click(within(heading("Company")).getByRole("button"));
    await user.click(within(heading("Job title")).getByRole("button"));

    expect(heading("Company").getAttribute("aria-sort")).toBeNull();
    expect(heading("Job title").getAttribute("aria-sort")).toBe("ascending");
    expect(screen.getByTestId("where").textContent).toBe("/table?sort=title&dir=asc");
  });

  it("sorts by pay with hourly pay as yearly pay, and puts empty values last (AC-12)", async () => {
    installFakeServer([
      application({ companyName: "Hourly", jobTitle: "x", salaryMin: 50, salaryMax: 60, salaryPeriod: "hourly" }),
      application({ companyName: "None", jobTitle: "x" }),
      application({ companyName: "Annual", jobTitle: "x", salaryMin: 90000, salaryMax: 120000, salaryPeriod: "annual" }),
    ]);
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");

    await user.click(within(heading("Pay")).getByRole("button"));
    expect(companies()).toEqual(["Annual", "Hourly", "None"]);
    await user.click(within(heading("Pay")).getByRole("button"));
    expect(companies()).toEqual(["Hourly", "Annual", "None"]);
  });

  it("applies a sort from the address, and a filter and a sort work together (AC-13)", async () => {
    installFakeServer(SAMPLE());
    openTableWithAddress("/table?stage=applied&sort=title&dir=desc");

    await screen.findByRole("table");

    expect(companies()).toEqual(["Acme Corp", "Initech"]);
    expect(heading("Job title").getAttribute("aria-sort")).toBe("descending");
  });
});

describe("TableView opens the application's page (spec 013, AC-1, AC-8)", () => {
  it("opens the page for a row I click, and the link back leaves the search, filters, and sort as they were (AC-1, AC-8)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table?q=acme&sort=company&dir=asc");
    await screen.findByRole("table");

    await user.click(screen.getByText("Globex"));

    expect(await screen.findByRole("heading", { level: 2, name: "Acme liaison" })).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toMatch(/^\/applications\/\d+$/);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("link", { name: "Back to table" }));
    await screen.findByRole("table");
    expect(screen.getByTestId("where").textContent).toBe("/table?q=acme&sort=company&dir=asc");
    expect(companies()).toEqual(["Acme Corp", "Globex"]);
  });

  it("opens the page from the keyboard, on the job title button (AC-1)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");

    screen.getByRole("button", { name: "Engineer" }).focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { level: 2, name: "Engineer" })).toBeTruthy();
    expect(screen.getByText("Acme Corp")).toBeTruthy();
  });

  it("shows the new values in the row after an edit and going back (AC-8)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table");
    await screen.findByRole("table");
    await user.click(screen.getByText("Acme Corp"));
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit application" });

    const title = within(dialog).getByLabelText("Job title");
    await user.clear(title);
    await user.type(title, "Staff Engineer");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await user.click(await screen.findByRole("link", { name: "Back to table" }));

    expect(await screen.findByText("Staff Engineer")).toBeTruthy();
  });

  it("leaves out a row that stops matching the filters after an edit (AC-8)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table?stage=applied");
    await screen.findByRole("table");
    expect(companies()).toEqual(["Acme Corp", "Initech"]);
    await user.click(screen.getByText("Acme Corp"));

    await user.selectOptions(await screen.findByRole("combobox", { name: "Stage" }), "interviewing");
    await user.click(await screen.findByRole("link", { name: "Back to table" }));

    await screen.findByText("1 of 3");
    expect(companies()).toEqual(["Initech"]);
  });

  it("goes back to the filtered table without the row after a delete (AC-7, AC-8)", async () => {
    installFakeServer(SAMPLE());
    const user = userEvent.setup();
    openTableWithAddress("/table?stage=applied");
    await screen.findByRole("table");
    await user.click(screen.getByText("Initech"));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await screen.findByRole("table");
    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied");
    expect(companies()).toEqual(["Acme Corp"]);
  });
});

describe("TableView archived view (spec 017, AC-3, AC-4)", () => {
  const archivedAt = "2026-10-02T09:00:00.000Z";
  const sample = () => [
    application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" }),
    application({ companyName: "Wonka", jobTitle: "Chocolatier", stage: "rejected", archivedAt }),
    application({ companyName: "Stark", jobTitle: "Welder", stage: "withdrawn", archivedAt }),
  ];
  const titles = () => bodyRows().map((row) => cells(row)[1]?.textContent);

  it("leaves archived applications out of the table, and lists only them under archived=1", async () => {
    installFakeServer(sample());
    await openTable();
    expect(titles()).toEqual(["Engineer"]);
  });

  it("lists only the archived ones in the archived view, with the same search and stage filter", async () => {
    installFakeServer(sample());
    await openTable("/table?archived=1");
    expect(titles().sort()).toEqual(["Chocolatier", "Welder"]);

    await userEvent.type(screen.getByRole("searchbox", { name: "Search company or job title" }), "wonka");
    expect(titles()).toEqual(["Chocolatier"]);
  });

  it("says nothing is archived when nothing is, and still says it when the others have applications", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer" })]);
    render(<AppAt path="/table?archived=1" />);

    expect(await screen.findByText("Nothing is archived.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("keeps the archived view in the address when searching and sorting", async () => {
    installFakeServer(sample());
    render(
      <MemoryRouter initialEntries={["/table?archived=1"]}>
        <App />
        <Where />
      </MemoryRouter>,
    );
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("button", { name: "Company" }));

    expect(screen.getByTestId("where").textContent).toBe("/table?archived=1&sort=company&dir=asc");
  });
});
