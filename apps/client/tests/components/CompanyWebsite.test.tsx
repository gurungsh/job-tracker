import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

function setup(website: string | null = "https://acme.example") {
  const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", companyWebsite: website });
  const server = installFakeServer([acme], ["Acme Corp", "Globex"]);
  (server.companies[0] as { website: string | null }).website = website;
  (server.companies[1] as { website: string | null }).website = "https://globex.example";
  return { acme, server };
}

async function openEdit(acme: { id: number }) {
  render(<AppAt path={`/applications/${String(acme.id)}`} />);
  await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
  const dialog = await screen.findByRole("dialog", { name: "Edit application" });
  return { dialog, website: within(dialog).getByLabelText<HTMLInputElement>("Website"), company: within(dialog).getByLabelText<HTMLInputElement>("Company") };
}

describe("the Website field in the application form (spec 017, AC-7)", () => {
  it("starts with the company's website when editing, and is empty with none", async () => {
    const { acme } = setup();
    const { website } = await openEdit(acme);

    expect(website.value).toBe("https://acme.example");
  });

  it("is empty for a company with no website", async () => {
    const { acme } = setup(null);
    const { website } = await openEdit(acme);

    expect(website.value).toBe("");
  });

  it("shows the chosen company's website when the Company field names another, none for a new one, and the original's again when put back", async () => {
    const { acme } = setup();
    const { website, company } = await openEdit(acme);

    await userEvent.clear(company);
    await userEvent.type(company, "globex");
    expect(website.value).toBe("https://globex.example");

    await userEvent.type(company, " Labs");
    expect(website.value).toBe("");

    await userEvent.clear(company);
    await userEvent.type(company, "Acme Corp");
    expect(website.value).toBe("https://acme.example");
  });

  it("saves a website typed without a scheme with https:// added, and the page links to it", async () => {
    const { acme, server } = setup(null);
    const { dialog, website } = await openEdit(acme);

    await userEvent.type(website, " acme.com ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    const link = await screen.findByRole("link", { name: "Acme Corp" });
    expect(link.getAttribute("href")).toBe("https://acme.com");
    expect(server.companies[0]?.website).toBe("https://acme.com");
    const put = server.requests.find((r) => r.method === "PUT");
    expect((put?.body as { companyWebsite: string }).companyWebsite).toBe("https://acme.com");
  });

  it("says why and saves nothing when it isn't a usable web address", async () => {
    const { acme, server } = setup(null);
    const { dialog, website } = await openEdit(acme);

    await userEvent.type(website, "ftp://acme.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("Website must be a web address starting with http:// or https://")).toBeTruthy();
    expect(server.requests.some((r) => r.method === "PUT")).toBe(false);
  });

  it("clears the website when emptied, and the page shows plain text again", async () => {
    const { acme, server } = setup();
    const { dialog, website } = await openEdit(acme);

    await userEvent.clear(website);
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await screen.findByRole("heading", { level: 2, name: "Engineer" });
    expect(screen.queryByRole("link", { name: "Acme Corp" })).toBeNull();
    expect(screen.getByText("Acme Corp")).toBeTruthy();
    expect(server.companies[0]?.website).toBeNull();
  });

  it("is in the Add application form too, and follows a known company typed there", async () => {
    const { server } = setup();
    render(<AppAt />);
    await userEvent.click(await screen.findByRole("button", { name: "Add Application" }));
    const dialog = await screen.findByRole("dialog", { name: "Add Application" });
    const website = within(dialog).getByLabelText<HTMLInputElement>("Website");
    expect(website.value).toBe("");

    await userEvent.type(within(dialog).getByLabelText("Company"), "Globex");
    expect(website.value).toBe("https://globex.example");

    await userEvent.type(within(dialog).getByLabelText("Job title"), "Designer");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /^(?!Archive|Restore|Move).*Designer/ });
    expect(server.applications.at(-1)?.companyWebsite).toBe("https://globex.example");
  });
});

describe("the company name on the detail page (spec 017, AC-8)", () => {
  it("is a link that opens the website in a new tab, with nothing leaking to the new page", async () => {
    const { acme } = setup();
    render(<AppAt path={`/applications/${String(acme.id)}`} />);

    const link = await screen.findByRole("link", { name: "Acme Corp" });

    expect(link.getAttribute("href")).toBe("https://acme.example");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("is plain text for a company with no website", async () => {
    const { acme } = setup(null);
    render(<AppAt path={`/applications/${String(acme.id)}`} />);

    await screen.findByRole("heading", { level: 2, name: "Engineer" });

    expect(screen.queryByRole("link", { name: "Acme Corp" })).toBeNull();
    expect(screen.getByText("Acme Corp")).toBeTruthy();
  });
});
