import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "../../src/components/Board.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer" });

async function openCard(name: RegExp) {
  await userEvent.click(await screen.findByRole("button", { name }));
  return screen.getByRole("dialog", { name: "Edit application" });
}

function details(panel: HTMLElement) {
  return within(within(panel).getByRole("group", { name: "Job details" }));
}

describe("job details section", () => {
  it("lists the job details in order below the other fields, with contract length only for contracts (AC-1)", async () => {
    installFakeServer([acme]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);

    const labels = () =>
      [...within(panel).getByRole("group", { name: "Job details" }).querySelectorAll("label")].map((label) => label.textContent);
    expect(labels()).toEqual([
      "Job link",
      "Location",
      "Work mode",
      "Employment type",
      "Salary minimum",
      "Salary maximum",
      "Salary period",
      "Source",
      "Job description",
    ]);

    await userEvent.selectOptions(details(panel).getByLabelText("Employment type"), "Contract");

    expect(labels()).toContain("Contract length (months)");
    expect(labels().indexOf("Contract length (months)")).toBe(labels().indexOf("Employment type") + 1);
  });

  it("saves every detail, and shows the saved values when reopened (AC-2, AC-13)", async () => {
    const server = installFakeServer([acme]);
    render(<Board />);
    let panel = await openCard(/Acme Corp/);
    const job = details(panel);

    await userEvent.type(job.getByLabelText("Job link"), "jobs.acme.com/123");
    await userEvent.type(job.getByLabelText("Location"), "Austin, TX");
    await userEvent.selectOptions(job.getByLabelText("Work mode"), "Hybrid");
    await userEvent.selectOptions(job.getByLabelText("Employment type"), "Contract");
    await userEvent.type(job.getByLabelText("Contract length (months)"), "6");
    await userEvent.type(job.getByLabelText("Salary minimum"), "140k");
    await userEvent.type(job.getByLabelText("Salary maximum"), "$170,000");
    await userEvent.selectOptions(job.getByLabelText("Salary period"), "Annual");
    await userEvent.type(job.getByLabelText("Source"), "LinkedIn");
    await userEvent.type(job.getByLabelText("Job description"), "Line one{Enter}{Enter}Line two");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: /Acme Corp/ });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(server.applications[0]).toMatchObject({
      jobLink: "https://jobs.acme.com/123",
      location: "Austin, TX",
      workMode: "hybrid",
      employmentType: "contract",
      contractLengthMonths: 6,
      salaryMin: 140_000,
      salaryMax: 170_000,
      salaryPeriod: "annual",
      source: "LinkedIn",
      jobDescription: "Line one\n\nLine two",
    });

    panel = await openCard(/Acme Corp/);
    const reopened = details(panel);
    expect(reopened.getByLabelText<HTMLInputElement>("Job link").value).toBe("https://jobs.acme.com/123");
    expect(reopened.getByLabelText<HTMLSelectElement>("Work mode").value).toBe("hybrid");
    expect(reopened.getByLabelText<HTMLInputElement>("Contract length (months)").value).toBe("6");
    expect(reopened.getByLabelText<HTMLInputElement>("Salary minimum").value).toBe("140,000");
    expect(reopened.getByLabelText<HTMLInputElement>("Salary maximum").value).toBe("170,000");
    expect(reopened.getByLabelText<HTMLTextAreaElement>("Job description").value).toBe("Line one\n\nLine two");
  });

  it("hides and clears the contract length when the type changes from Contract (AC-6)", async () => {
    const server = installFakeServer([
      { ...acme, employmentType: "contract", contractLengthMonths: 6 },
    ]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);
    const job = details(panel);

    await userEvent.selectOptions(job.getByLabelText("Employment type"), "Full-time");

    expect(job.queryByLabelText("Contract length (months)")).toBeNull();
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /Acme Corp/ });
    expect(server.applications[0]).toMatchObject({ employmentType: "full_time", contractLengthMonths: null });
  });

  it("asks before throwing away changes to job details only (AC-10)", async () => {
    installFakeServer([acme]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);

    await userEvent.type(details(panel).getByLabelText("Source"), "Referral");
    await userEvent.click(within(panel).getByRole("button", { name: "Close" }));

    expect(screen.getByRole("alertdialog", { name: "Discard changes?" })).toBeTruthy();
  });

  it("doesn't count saved amounts shown with commas as a change", async () => {
    installFakeServer([{ ...acme, salaryMin: 140_000, salaryPeriod: "annual" }]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);

    await userEvent.click(within(panel).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("open posting link", () => {
  it("opens the normalized link in a new tab, and appears only for a valid link (AC-4, AC-12)", async () => {
    installFakeServer([acme]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);
    const job = details(panel);

    expect(job.queryByRole("link", { name: "Open posting" })).toBeNull();
    await userEvent.type(job.getByLabelText("Job link"), "jobs.acme.com/123");

    const link = job.getByRole("link", { name: "Open posting" });
    expect(link.getAttribute("href")).toBe("https://jobs.acme.com/123");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    await userEvent.clear(job.getByLabelText("Job link"));
    await userEvent.type(job.getByLabelText("Job link"), "ftp://acme.com/jobs");
    expect(job.queryByRole("link", { name: "Open posting" })).toBeNull();
  });
});

describe("salary summary", () => {
  it("updates as I type (AC-5)", async () => {
    installFakeServer([acme]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);
    const job = details(panel);
    const summary = () => panel.querySelector(".salary-summary")?.textContent;

    expect(summary()).toBe("");
    await userEvent.type(job.getByLabelText("Salary minimum"), "140k");
    expect(summary()).toBe("From $140,000");
    await userEvent.selectOptions(job.getByLabelText("Salary period"), "Annual");
    expect(summary()).toBe("From $140,000 per year");
    await userEvent.type(job.getByLabelText("Salary maximum"), "170,000");
    expect(summary()).toBe("$140,000–$170,000 per year");
    await userEvent.type(job.getByLabelText("Salary maximum"), "x");
    expect(summary()).toBe("From $140,000 per year");
  });

  it("is announced to screen readers", async () => {
    installFakeServer([acme]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);

    expect(panel.querySelector(".salary-summary")?.getAttribute("aria-live")).toBe("polite");
  });
});

describe("board cards", () => {
  it("show only the spec 002 content, even with every detail filled in (AC-11)", async () => {
    installFakeServer([
      {
        ...acme,
        nextStep: "Follow up",
        nextStepDue: "2026-10-05",
        jobLink: "https://jobs.acme.com/123",
        location: "Austin, TX",
        workMode: "remote",
        employmentType: "contract",
        contractLengthMonths: 6,
        salaryMin: 140_000,
        salaryMax: 170_000,
        salaryPeriod: "annual",
        source: "LinkedIn",
        jobDescription: "Build things",
      },
    ]);
    render(<Board />);

    const card = await screen.findByRole("button", { name: /Acme Corp/ });

    expect(card.textContent).toBe("Acme CorpEngineerFollow up Oct 5, 2026");
  });
});

describe("job detail validation (AC-7)", () => {
  function errorFor(panel: HTMLElement, label: string) {
    const control = details(panel).getByLabelText(label);
    return document.getElementById(control.getAttribute("aria-describedby") ?? "")?.textContent;
  }

  async function tryToSave(fill: (job: ReturnType<typeof details>) => Promise<void>) {
    const server = installFakeServer([acme]);
    render(<Board />);
    const panel = await openCard(/Acme Corp/);
    await fill(details(panel));
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));
    expect(server.requests.some((request) => request.method === "PUT")).toBe(false);
    return panel;
  }

  it("flags a minimum above the maximum", async () => {
    const panel = await tryToSave(async (job) => {
      await userEvent.type(job.getByLabelText("Salary minimum"), "170k");
      await userEvent.type(job.getByLabelText("Salary maximum"), "140k");
      await userEvent.selectOptions(job.getByLabelText("Salary period"), "Annual");
    });

    expect(errorFor(panel, "Salary minimum")).toBe("Minimum salary can't be more than the maximum");
  });

  it("flags an amount without a period", async () => {
    const panel = await tryToSave(async (job) => {
      await userEvent.type(job.getByLabelText("Salary maximum"), "140k");
    });

    expect(errorFor(panel, "Salary period")).toBe("Choose annual or hourly for the salary");
  });

  it("flags a period without an amount", async () => {
    const panel = await tryToSave(async (job) => {
      await userEvent.selectOptions(job.getByLabelText("Salary period"), "Hourly");
    });

    expect(errorFor(panel, "Salary period")).toBe("Enter a salary amount, or clear the period");
  });

  it("flags a link with another scheme, and an amount it can't read", async () => {
    const panel = await tryToSave(async (job) => {
      await userEvent.type(job.getByLabelText("Job link"), "ftp://acme.com/jobs");
      await userEvent.type(job.getByLabelText("Salary minimum"), "about 140k");
      await userEvent.selectOptions(job.getByLabelText("Salary period"), "Annual");
    });

    expect(errorFor(panel, "Job link")).toBe("Job link must be a web address starting with http:// or https://");
    expect(errorFor(panel, "Salary minimum")).toBe("Minimum salary must be whole dollars, like 140,000 or 140k");
    expect(details(panel).getByLabelText("Job link").getAttribute("aria-invalid")).toBe("true");
  });

  it("flags a contract length outside 1 to 120 months", async () => {
    const panel = await tryToSave(async (job) => {
      await userEvent.selectOptions(job.getByLabelText("Employment type"), "Contract");
      await userEvent.type(job.getByLabelText("Contract length (months)"), "200");
    });

    expect(errorFor(panel, "Contract length (months)")).toBe("Contract length must be 1 to 120 months");
  });
});
