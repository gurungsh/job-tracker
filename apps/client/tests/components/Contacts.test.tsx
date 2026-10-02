import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "../../src/components/Board.tsx";
import { activity, application, contact, installFakeServer } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

async function openTab(tab: "Contacts" | "Timeline", server = installFakeServer([acme])) {
  render(<Board />);
  await userEvent.click(await screen.findByRole("button", { name: /Acme Corp/ }));
  await userEvent.click(screen.getByRole("tab", { name: tab }));
  return server;
}

const addForm = () => screen.getByRole("form", { name: "Add contact" });
const cardsText = () => screen.getAllByRole("listitem").map((item) => item.textContent);

describe("the Contacts tab", () => {
  it("is offered for an existing application, after Details and Timeline, and not for a new one (AC-1)", async () => {
    installFakeServer([acme]);
    render(<Board />);

    await userEvent.click(await screen.findByRole("button", { name: /Acme Corp/ }));
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Details", "Timeline", "Contacts"]);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    await userEvent.click(screen.getByRole("button", { name: "Add application" }));
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("says there are no contacts yet, and names the company (AC-2, AC-12)", async () => {
    await openTab("Contacts");

    expect(await screen.findByRole("heading", { name: "People at Acme Corp" })).toBeTruthy();
    expect(screen.getByText(/No contacts yet/)).toBeTruthy();
  });

  it("lists the company's contacts by name, ignoring case, with only the details that are filled in (AC-2)", async () => {
    const server = installFakeServer([acme]);
    server.contacts.push(
      contact({ companyId: acme.companyId, name: "zed", role: "Manager" }),
      contact({ companyId: acme.companyId, name: "Adam", email: "adam@acme.com", phone: "555-0100", notes: "Line one\nLine two" }),
      contact({ companyId: acme.companyId + 1, name: "Someone else" }),
    );

    await openTab("Contacts", server);
    await screen.findAllByRole("listitem");

    const [first, second] = cardsText();
    expect(cardsText()).toHaveLength(2);
    expect(first).toContain("Adam");
    expect(first).toContain("adam@acme.com");
    expect(first).toContain("555-0100");
    expect(second).toContain("zed · Manager");
    expect(second).not.toContain("@");
    expect(document.querySelector(".contact-notes")?.textContent).toBe("Line one\nLine two");
    expect(screen.queryByText("Someone else")).toBeNull();
  });

  it("adds a contact, shows it, and clears the form (AC-3)", async () => {
    const server = await openTab("Contacts");
    await screen.findByRole("form", { name: "Add contact" });
    const form = within(addForm());

    await userEvent.type(form.getByLabelText("Name"), "Sam Lee");
    await userEvent.type(form.getByLabelText("Role"), "Recruiter");
    await userEvent.type(form.getByLabelText("Email"), "sam@acme.com");
    await userEvent.type(form.getByLabelText("Phone"), "555-0100");
    await userEvent.type(form.getByLabelText("Notes"), "Prefers email");
    await userEvent.click(form.getByRole("button", { name: "Add contact" }));

    const item = await screen.findByRole("listitem");
    expect(item.textContent).toContain("Sam Lee · Recruiter");
    expect(item.textContent).toContain("Prefers email");
    expect(server.contacts).toEqual([
      expect.objectContaining({ companyId: acme.companyId, name: "Sam Lee", role: "Recruiter", email: "sam@acme.com", phone: "555-0100" }),
    ]);
    expect(form.getByLabelText<HTMLInputElement>("Name").value).toBe("");
    expect(form.getByLabelText<HTMLTextAreaElement>("Notes").value).toBe("");
  });

  it("shows contacts added from one application on another at the same company, and not at another company (AC-3)", async () => {
    const second = application({ companyName: "Acme Corp", jobTitle: "Designer", stage: "applied" });
    const other = application({ companyName: "Globex", jobTitle: "Analyst", stage: "applied" });
    const server = installFakeServer([acme, second, other]);
    // The fake server numbers companies on its own, so give the two Acme applications one company.
    second.companyId = acme.companyId;
    server.contacts.push(contact({ companyId: acme.companyId, name: "Shared Sam" }));
    render(<Board />);

    await userEvent.click(await screen.findByRole("button", { name: /Designer/ }));
    await userEvent.click(screen.getByRole("tab", { name: "Contacts" }));
    expect(await screen.findByText("Shared Sam")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    await userEvent.click(screen.getByRole("button", { name: /Analyst/ }));
    await userEvent.click(screen.getByRole("tab", { name: "Contacts" }));
    expect(await screen.findByText(/No contacts yet/)).toBeTruthy();
  });

  it("explains a missing name and a bad email next to the field, and sends nothing (AC-4)", async () => {
    const server = await openTab("Contacts");
    await screen.findByRole("form", { name: "Add contact" });
    const form = within(addForm());

    await userEvent.click(form.getByRole("button", { name: "Add contact" }));
    expect(form.getByText("Name is required")).toBeTruthy();

    await userEvent.type(form.getByLabelText("Name"), "Sam");
    await userEvent.type(form.getByLabelText("Email"), "not-an-email");
    await userEvent.click(form.getByRole("button", { name: "Add contact" }));
    expect(form.getByText("Email must be a valid email address")).toBeTruthy();
    expect(server.requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("keeps what I typed when adding fails, and says why (AC-13)", async () => {
    const server = await openTab("Contacts");
    await screen.findByRole("form", { name: "Add contact" });
    const form = within(addForm());
    await userEvent.type(form.getByLabelText("Name"), "Sam");
    server.setOffline(true);

    await userEvent.click(form.getByRole("button", { name: "Add contact" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't save the contact");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(form.getByLabelText<HTMLInputElement>("Name").value).toBe("Sam");
  });

  it("shows an error with a way to try again when loading fails (AC-13)", async () => {
    const server = installFakeServer([acme]);
    render(<Board />);
    await userEvent.click(await screen.findByRole("button", { name: /Acme Corp/ }));
    server.setOffline(true);
    await userEvent.click(screen.getByRole("tab", { name: "Contacts" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the contacts");

    server.setOffline(false);
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("form", { name: "Add contact" })).toBeTruthy();
  });

  it("keeps unsaved Details changes when switching to Contacts and back (AC-14)", async () => {
    await openTab("Contacts");
    await userEvent.click(screen.getByRole("tab", { name: "Details" }));
    await userEvent.type(screen.getByLabelText("Job title"), " II");
    await userEvent.click(screen.getByRole("tab", { name: "Contacts" }));
    expect(screen.queryByRole("textbox", { name: "Job title" })).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Details" }));

    expect(screen.getByLabelText<HTMLInputElement>("Job title").value).toBe("Engineer II");
  });
});

describe("editing and deleting contacts", () => {
  function withContact() {
    const server = installFakeServer([acme]);
    const sam = contact({ companyId: acme.companyId, name: "Sam", role: "Recruiter", email: "sam@acme.com" });
    server.contacts.push(sam);
    return { server, sam };
  }

  it("changes a contact's details, and Cancel discards (AC-6)", async () => {
    const { server } = withContact();
    await openTab("Contacts", server);
    await screen.findByText("Sam");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.type(within(screen.getByRole("form", { name: "Edit contact" })).getByLabelText("Name"), " cancelled");
    await userEvent.click(within(screen.getByRole("form", { name: "Edit contact" })).getByRole("button", { name: "Cancel" }));
    expect(server.contacts[0]?.name).toBe("Sam");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const form = within(screen.getByRole("form", { name: "Edit contact" }));
    expect(form.getByLabelText<HTMLInputElement>("Email").value).toBe("sam@acme.com");
    await userEvent.clear(form.getByLabelText("Name"));
    await userEvent.type(form.getByLabelText("Name"), "Samantha Lee");
    await userEvent.clear(form.getByLabelText("Role"));
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Edit contact" })).toBeNull();
    });
    expect(screen.getByRole("listitem").textContent).toContain("Samantha Lee");
    expect(screen.getByRole("listitem").textContent).not.toContain("Recruiter");
    expect(server.contacts[0]).toMatchObject({ name: "Samantha Lee", role: null });
  });

  it("asks first, and says how many entries mention the contact (AC-7)", async () => {
    const { server, sam } = withContact();
    server.activities.push(
      activity({ applicationId: acme.id, contactId: sam.id, contactName: "Sam" }),
      activity({ applicationId: acme.id, contactId: sam.id, contactName: "Sam" }),
    );
    await openTab("Contacts", server);
    await screen.findByText("Sam");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("2 timeline entries mention them");
    expect(dialog.textContent).toContain("They will stay, but no longer name anyone");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(server.contacts).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Sam")).toBeNull();
    });
    expect(server.contacts).toHaveLength(0);
    expect(server.activities.every((entry) => entry.contactId === null)).toBe(true);
  });

  it("doesn't mention entries when there are none (AC-7)", async () => {
    const { server } = withContact();
    await openTab("Contacts", server);
    await screen.findByText("Sam");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("alertdialog").textContent).not.toContain("timeline");
  });

  it("says why a delete failed and keeps the contact (AC-13)", async () => {
    const { server } = withContact();
    await openTab("Contacts", server);
    await screen.findByText("Sam");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    server.setOffline(true);

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't delete Sam");
    expect(screen.getByText("Sam")).toBeTruthy();
  });
});

describe("a contact on a timeline entry", () => {
  function withEntries() {
    const server = installFakeServer([acme]);
    const sam = contact({ companyId: acme.companyId, name: "Sam" });
    const pat = contact({ companyId: acme.companyId, name: "Pat" });
    server.contacts.push(sam, pat);
    server.activities.push(
      activity({ applicationId: acme.id, type: "call", occurredOn: "2026-10-09", text: "Recruiter call", contactId: sam.id, contactName: "Sam" }),
      activity({ applicationId: acme.id, type: "stage_change", occurredOn: "2026-10-01", text: "Added to Applied" }),
    );
    return { server, sam, pat };
  }

  it("offers None and the company's contacts when adding, and saves the choice (AC-8)", async () => {
    const { server, pat } = withEntries();
    await openTab("Timeline", server);
    const form = within(await screen.findByRole("form", { name: "Add entry" }));

    const options = within(form.getByLabelText("Contact")).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["None", "Pat", "Sam"]);
    await userEvent.selectOptions(form.getByLabelText("Contact"), "Pat");
    await userEvent.type(form.getByLabelText("Text"), "Followed up");
    await userEvent.click(form.getByRole("button", { name: "Add entry" }));

    await waitFor(() => {
      expect(server.activities.some((entry) => entry.text === "Followed up")).toBe(true);
    });
    expect(server.activities.find((entry) => entry.text === "Followed up")).toMatchObject({ contactId: pat.id, contactName: "Pat" });
    const item = screen.getAllByRole("listitem").find((i) => i.textContent.includes("Followed up"));
    expect(item?.textContent).toContain("with Pat");
    expect(within(form.getByLabelText("Contact")).getByRole("option", { name: "None" })).toBeTruthy();
  });

  it("shows who an entry involved, and nothing for entries with no contact (AC-8, AC-12)", async () => {
    const { server } = withEntries();
    await openTab("Timeline", server);

    const items = await screen.findAllByRole("listitem");
    expect(items[0]?.textContent).toContain("with Sam");
    expect(items[1]?.textContent).not.toContain("with");
  });

  it("changes or removes the contact when editing (AC-8)", async () => {
    const { server, pat } = withEntries();
    await openTab("Timeline", server);
    const items = await screen.findAllByRole("listitem");

    await userEvent.click(within(items[0] as HTMLElement).getByRole("button", { name: "Edit" }));
    let form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.getByLabelText<HTMLSelectElement>("Contact").selectedOptions[0]?.textContent).toBe("Sam");
    await userEvent.selectOptions(form.getByLabelText("Contact"), "Pat");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(server.activities[0]).toMatchObject({ contactId: pat.id, contactName: "Pat" });
    });
    expect(await screen.findByText("with Pat")).toBeTruthy();

    await userEvent.click(within(screen.getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: "Edit" }));
    form = within(screen.getByRole("form", { name: "Edit entry" }));
    await userEvent.selectOptions(form.getByLabelText("Contact"), "None");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(server.activities[0]).toMatchObject({ contactId: null, contactName: null });
    });
    expect(screen.queryByText(/^with /)).toBeNull();
  });

  it("lets an automatic entry take a contact too (AC-9)", async () => {
    const { server, sam } = withEntries();
    await openTab("Timeline", server);
    const items = await screen.findAllByRole("listitem");

    await userEvent.click(within(items[1] as HTMLElement).getByRole("button", { name: "Edit" }));
    const form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.queryByLabelText("Type")).toBeNull();
    await userEvent.selectOptions(form.getByLabelText("Contact"), "Sam");
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(server.activities[1]).toMatchObject({ type: "stage_change", contactId: sam.id });
    });
  });

  it("shows a renamed contact's new name on its entries (AC-6)", async () => {
    const { server } = withEntries();
    await openTab("Contacts", server);
    await userEvent.click(await screen.findAllByRole("button", { name: "Edit" }).then((buttons) => buttons[1] as HTMLElement));
    const form = within(screen.getByRole("form", { name: "Edit contact" }));
    await userEvent.clear(form.getByLabelText("Name"));
    await userEvent.type(form.getByLabelText("Name"), "Samantha");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Edit contact" })).toBeNull();
    });

    await userEvent.click(screen.getByRole("tab", { name: "Timeline" }));

    expect(await screen.findByText("with Samantha")).toBeTruthy();
  });
});
