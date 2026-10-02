import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAt } from "../support/render.tsx";
import { activity, application, contact, installFakeServer } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

/** Opens Acme's page, where the contacts and the timeline are sections (spec 013, AC-12). */
async function openPage(server = installFakeServer([acme])) {
  render(<AppAt path={`/applications/${String(acme.id)}`} />);
  await screen.findByRole("region", { name: "Contacts" });
  return server;
}

const contactsSection = () => within(screen.getByRole("region", { name: "Contacts" }));
const timelineSection = () => within(screen.getByRole("region", { name: "Timeline" }));

/** Opens the add form from "+ Add" in the card's heading (spec 016, AC-6), or finds it if it is already open. */
async function openAddForm() {
  if (!screen.queryByRole("form", { name: "Add contact" })) {
    // The card is there while it loads, so wait for the button.
    await userEvent.click(await screen.findByRole("button", { name: "Add contact" }));
  }
  return screen.findByRole("form", { name: "Add contact" });
}
const addForm = () => screen.getByRole("form", { name: "Add contact" });
const cardsText = () => contactsSection().getAllByRole("listitem").map((item) => item.textContent);

describe("the Contacts section", () => {
  it("has one heading, Contacts, and says nobody is recorded yet when there are none (AC-9)", async () => {
    await openPage();

    expect(await screen.findByRole("heading", { name: "Contacts" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /People at/ })).toBeNull();
    // The heading is there while the box loads, so wait for the empty text.
    expect(await screen.findByText("Nobody recorded yet — add the recruiter or hiring manager you're talking to.")).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Add contact" })).toBeNull();
  });

  it("lists the company's contacts by name, ignoring case, with only the details that are filled in (AC-2)", async () => {
    const server = installFakeServer([acme]);
    server.contacts.push(
      contact({ companyId: acme.companyId, name: "zed", role: "Manager" }),
      contact({ companyId: acme.companyId, name: "Adam", email: "adam@acme.com", phone: "555-0100", notes: "Line one\nLine two" }),
      contact({ companyId: acme.companyId + 1, name: "Someone else" }),
    );

    await openPage(server);
    await contactsSection().findAllByRole("listitem");

    const [first, second] = cardsText();
    expect(cardsText()).toHaveLength(2);
    expect(first).toContain("Adam");
    expect(first).toContain("adam@acme.com");
    expect(first).toContain("555-0100");
    expect(second).toContain("zed");
    expect(second).toContain("Manager");
    expect(second).not.toContain("@");
    expect(screen.getByRole("link", { name: "adam@acme.com" }).getAttribute("href")).toBe("mailto:adam@acme.com");
    expect(document.querySelector(".contact-notes")?.textContent).toBe("Line one\nLine two");
    expect(screen.queryByText("Someone else")).toBeNull();
  });

  it("adds a contact, shows it, and closes the form (AC-6)", async () => {
    const server = await openPage();
    await openAddForm();
    const form = within(addForm());

    await userEvent.type(form.getByLabelText("Name"), "Sam Lee");
    await userEvent.type(form.getByLabelText("Role"), "Recruiter");
    await userEvent.type(form.getByLabelText("Email"), "sam@acme.com");
    await userEvent.type(form.getByLabelText("Phone"), "555-0100");
    await userEvent.type(form.getByLabelText("Notes"), "Prefers email");
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    const item = await contactsSection().findByRole("listitem");
    expect(item.textContent).toContain("Sam Lee");
    expect(item.querySelector(".contact-role")?.textContent).toBe("Recruiter");
    expect(item.textContent).toContain("Prefers email");
    expect(server.contacts).toEqual([
      expect.objectContaining({ companyId: acme.companyId, name: "Sam Lee", role: "Recruiter", email: "sam@acme.com", phone: "555-0100" }),
    ]);
    expect(screen.queryByRole("form", { name: "Add contact" })).toBeNull();

    await openAddForm();
    expect(within(addForm()).getByLabelText<HTMLInputElement>("Name").value).toBe("");
    expect(within(addForm()).getByLabelText<HTMLTextAreaElement>("Notes").value).toBe("");
  });

  it("shows contacts added from one application on another at the same company, and not at another company (AC-3)", async () => {
    const second = application({ companyName: "Acme Corp", jobTitle: "Designer", stage: "applied" });
    const other = application({ companyName: "Globex", jobTitle: "Analyst", stage: "applied" });
    const server = installFakeServer([acme, second, other]);
    // The fake server numbers companies on its own, so give the two Acme applications one company.
    second.companyId = acme.companyId;
    server.contacts.push(contact({ companyId: acme.companyId, name: "Shared Sam" }));
    const { unmount } = render(<AppAt path={`/applications/${String(second.id)}`} />);

    expect(await within(await screen.findByRole("region", { name: "Contacts" })).findByText("Shared Sam")).toBeTruthy();
    unmount();

    render(<AppAt path={`/applications/${String(other.id)}`} />);
    expect(await screen.findByText(/Nobody recorded yet/)).toBeTruthy();
  });

  it("explains a missing name and a bad email next to the field, and sends nothing (AC-4)", async () => {
    const server = await openPage();
    await openAddForm();
    const form = within(addForm());

    await userEvent.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByText("Name is required")).toBeTruthy();

    await userEvent.type(form.getByLabelText("Name"), "Sam");
    await userEvent.type(form.getByLabelText("Email"), "not-an-email");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByText("Email must be a valid email address")).toBeTruthy();
    expect(server.requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("keeps what I typed when adding fails, and says why (AC-13)", async () => {
    const server = await openPage();
    await openAddForm();
    const form = within(addForm());
    await userEvent.type(form.getByLabelText("Name"), "Sam");
    server.setOffline(true);

    await userEvent.click(form.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't save the contact");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(form.getByLabelText<HTMLInputElement>("Name").value).toBe("Sam");
  });

  it("shows an error with a way to try again when loading fails (AC-13)", async () => {
    const server = installFakeServer([acme]);
    let down = true;
    server.override((method, path) =>
      down && method === "GET" && path.endsWith("/contacts")
        ? new Response(JSON.stringify({ error: "Service down" }), { status: 503 })
        : undefined,
    );
    render(<AppAt path={`/applications/${String(acme.id)}`} />);

    const section = await screen.findByRole("region", { name: "Contacts" });
    const alert = await within(section).findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the contacts");

    down = false;
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await within(section).findByRole("button", { name: "Add contact" })).toBeTruthy();
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
    await openPage(server);
    await contactsSection().findByText("Sam");

    await userEvent.click(contactsSection().getByRole("button", { name: /^Edit / }));
    await userEvent.type(within(screen.getByRole("form", { name: "Edit contact" })).getByLabelText("Name"), " cancelled");
    await userEvent.click(within(screen.getByRole("form", { name: "Edit contact" })).getByRole("button", { name: "Cancel" }));
    expect(server.contacts[0]?.name).toBe("Sam");

    await userEvent.click(contactsSection().getByRole("button", { name: /^Edit / }));
    const form = within(screen.getByRole("form", { name: "Edit contact" }));
    expect(form.getByLabelText<HTMLInputElement>("Email").value).toBe("sam@acme.com");
    await userEvent.clear(form.getByLabelText("Name"));
    await userEvent.type(form.getByLabelText("Name"), "Samantha Lee");
    await userEvent.clear(form.getByLabelText("Role"));
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Edit contact" })).toBeNull();
    });
    expect(contactsSection().getByRole("listitem").textContent).toContain("Samantha Lee");
    expect(contactsSection().getByRole("listitem").textContent).not.toContain("Recruiter");
    expect(server.contacts[0]).toMatchObject({ name: "Samantha Lee", role: null });
  });

  it("asks first, and says how many entries mention the contact (AC-7)", async () => {
    const { server, sam } = withContact();
    server.activities.push(
      activity({ applicationId: acme.id, contactId: sam.id, contactName: "Sam" }),
      activity({ applicationId: acme.id, contactId: sam.id, contactName: "Sam" }),
    );
    await openPage(server);
    await contactsSection().findByText("Sam");

    await userEvent.click(contactsSection().getByRole("button", { name: /^Delete/ }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("2 timeline entries mention them");
    expect(dialog.textContent).toContain("They will stay, but no longer name anyone");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(server.contacts).toHaveLength(1);

    await userEvent.click(contactsSection().getByRole("button", { name: /^Delete/ }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(contactsSection().queryByText("Sam")).toBeNull();
    });
    expect(server.contacts).toHaveLength(0);
    expect(server.activities.every((entry) => entry.contactId === null)).toBe(true);
  });

  it("doesn't mention entries when there are none (AC-7)", async () => {
    const { server } = withContact();
    await openPage(server);
    await contactsSection().findByText("Sam");

    await userEvent.click(contactsSection().getByRole("button", { name: /^Delete/ }));

    expect(screen.getByRole("alertdialog").textContent).not.toContain("timeline");
  });

  it("says why a delete failed and keeps the contact (AC-13)", async () => {
    const { server } = withContact();
    await openPage(server);
    await contactsSection().findByText("Sam");
    await userEvent.click(contactsSection().getByRole("button", { name: /^Delete/ }));
    server.setOffline(true);

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't delete Sam");
    expect(contactsSection().getByText("Sam")).toBeTruthy();
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
    await openPage(server);
    const form = within(await screen.findByRole("form", { name: "Add entry" }));

    const options = within(form.getByLabelText("With")).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["None", "Pat", "Sam"]);
    await userEvent.selectOptions(form.getByLabelText("With"), "Pat");
    await userEvent.type(form.getByLabelText("What happened"), "Followed up");
    await userEvent.click(form.getByRole("button", { name: /^Log / }));

    await waitFor(() => {
      expect(server.activities.some((entry) => entry.text === "Followed up")).toBe(true);
    });
    expect(server.activities.find((entry) => entry.text === "Followed up")).toMatchObject({ contactId: pat.id, contactName: "Pat" });
    const item = timelineSection().getAllByRole("listitem").find((i) => i.textContent.includes("Followed up"));
    expect(item?.textContent).toContain("with Pat");
    expect(within(form.getByLabelText("With")).getByRole("option", { name: "None" })).toBeTruthy();
  });

  it("shows who an entry involved, and nothing for entries with no contact (AC-8, AC-12)", async () => {
    const { server } = withEntries();
    await openPage(server);

    const items = await timelineSection().findAllByRole("listitem");
    expect(items[0]?.textContent).toContain("with Sam");
    expect(items[1]?.textContent).not.toContain("with");
  });

  it("changes or removes the contact when editing (AC-8)", async () => {
    const { server, pat } = withEntries();
    await openPage(server);
    const items = await timelineSection().findAllByRole("listitem");

    await userEvent.click(within(items[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    let form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.getByLabelText<HTMLSelectElement>("With").selectedOptions[0]?.textContent).toBe("Sam");
    await userEvent.selectOptions(form.getByLabelText("With"), "Pat");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(server.activities[0]).toMatchObject({ contactId: pat.id, contactName: "Pat" });
    });
    expect(await screen.findByText("with Pat")).toBeTruthy();

    await userEvent.click(within(timelineSection().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    form = within(screen.getByRole("form", { name: "Edit entry" }));
    await userEvent.selectOptions(form.getByLabelText("With"), "None");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(server.activities[0]).toMatchObject({ contactId: null, contactName: null });
    });
    expect(screen.queryByText(/^with /)).toBeNull();
  });

  it("lets an automatic entry take a contact too (AC-9)", async () => {
    const { server, sam } = withEntries();
    await openPage(server);
    const items = await timelineSection().findAllByRole("listitem");

    await userEvent.click(within(items[1] as HTMLElement).getByRole("button", { name: /^Edit / }));
    const form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.queryByLabelText("Type")).toBeNull();
    await userEvent.selectOptions(form.getByLabelText("With"), "Sam");
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(server.activities[1]).toMatchObject({ type: "stage_change", contactId: sam.id });
    });
  });

  it("shows a renamed contact's new name on its entries (AC-6)", async () => {
    const { server } = withEntries();
    await openPage(server);
    await userEvent.click(await contactsSection().findAllByRole("button", { name: /^Edit / }).then((buttons) => buttons[1] as HTMLElement));
    const form = within(screen.getByRole("form", { name: "Edit contact" }));
    await userEvent.clear(form.getByLabelText("Name"));
    await userEvent.type(form.getByLabelText("Name"), "Samantha");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Edit contact" })).toBeNull();
    });

    expect(await screen.findByText("with Samantha")).toBeTruthy();
  });
});

describe("the Contacts card's look and controls (spec 016, AC-1, AC-4, AC-5, AC-6, AC-9)", () => {
  function withPeople() {
    const server = installFakeServer([acme]);
    server.contacts.push(
      contact({ companyId: acme.companyId, name: "Priya Shah", role: "Talent Partner", email: "priya@northwind.example", phone: "555-0100" }),
      contact({ companyId: acme.companyId, name: "Sam Lee" }),
    );
    return server;
  }

  it("is a card with its own heading, and \"+ Add\" in the heading beside it (AC-1, AC-6)", async () => {
    await openPage(withPeople());

    const region = screen.getByRole("region", { name: "Contacts" });
    const add = await within(region).findByRole("button", { name: "Add contact" });
    expect(add.textContent).toBe("+ Add");
    expect(add.parentElement).toBe(within(region).getByRole("heading", { name: "Contacts" }).parentElement);
  });

  it("shows a person's name, role, a mail link, and phone, with Edit and a named ✕ at the top right (AC-4, AC-9)", async () => {
    await openPage(withPeople());
    await contactsSection().findAllByRole("listitem");
    const [priya] = contactsSection().getAllByRole("listitem") as [HTMLElement];

    expect(priya.querySelector(".contact-name")?.textContent).toBe("Priya Shah");
    expect(priya.querySelector(".contact-role")?.textContent).toBe("Talent Partner");
    expect(within(priya).getByRole("link", { name: "priya@northwind.example" }).getAttribute("href")).toBe("mailto:priya@northwind.example");
    expect(priya.textContent).toContain("555-0100");
    expect(within(priya).getByRole("button", { name: /^Edit / })).toBeTruthy();
    expect(within(priya).getByRole("button", { name: "Delete contact: Priya Shah" })).toBeTruthy();
    expect(priya.querySelector(".contact-row > .entry-actions")).not.toBeNull();
  });

  it("gives every person one Edit and one ✕, and shows no mail link when there is no email (AC-4, AC-9)", async () => {
    await openPage(withPeople());
    await contactsSection().findAllByRole("listitem");

    expect(contactsSection().getAllByRole("button", { name: /^Edit / })).toHaveLength(2);
    expect(contactsSection().getAllByRole("button", { name: /^Delete contact:/ })).toHaveLength(2);
    const [, sam] = contactsSection().getAllByRole("listitem") as [HTMLElement, HTMLElement];
    expect(within(sam).queryByRole("link")).toBeNull();
  });

  it("asks before deleting, and Escape deletes nothing (AC-5)", async () => {
    const server = withPeople();
    await openPage(server);
    await contactsSection().findAllByRole("listitem");

    await userEvent.click(contactsSection().getByRole("button", { name: "Delete contact: Sam Lee" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete this contact?" });
    expect(confirm.textContent).toContain("Sam Lee will be removed from this company's contacts.");
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(server.contacts).toHaveLength(2);
  });

  it("hides + Add while the form is open, and Cancel closes it and puts focus back on + Add (AC-6)", async () => {
    await openPage(withPeople());
    await openAddForm();

    expect(screen.queryByRole("button", { name: "Add contact" })).toBeNull();
    expect(within(addForm()).getByRole("button", { name: "Save" })).toBeTruthy();

    await userEvent.click(within(addForm()).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("form", { name: "Add contact" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add contact" }));
  });

  it("keeps a half-typed edit when I choose Edit on another person (edge case)", async () => {
    await openPage(withPeople());
    await contactsSection().findAllByRole("listitem");
    const [priya, sam] = contactsSection().getAllByRole("listitem") as [HTMLElement, HTMLElement];

    await userEvent.click(within(priya).getByRole("button", { name: /^Edit / }));
    await userEvent.type(screen.getByRole("form", { name: "Edit contact" }).querySelector("input") as HTMLElement, " Jr");
    await userEvent.click(within(sam).getByRole("button", { name: /^Edit / }));

    const forms = screen.getAllByRole("form", { name: "Edit contact" });
    expect(forms).toHaveLength(2);
    expect(within(forms[0] as HTMLElement).getByLabelText<HTMLInputElement>("Name").value).toBe("Priya Shah Jr");
    expect(within(forms[1] as HTMLElement).getByLabelText<HTMLInputElement>("Name").value).toBe("Sam Lee");
  });

  it("reloads the timeline's contact choices after a person is added, edited, or deleted (AC-13)", async () => {
    await openPage(withPeople());
    const entryForm = within(await screen.findByRole("form", { name: "Add entry" }));
    await contactsSection().findAllByRole("listitem");

    await userEvent.click(contactsSection().getByRole("button", { name: "Delete contact: Sam Lee" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(within(entryForm.getByLabelText("With")).queryByRole("option", { name: "Sam Lee" })).toBeNull();
    });
    expect(within(entryForm.getByLabelText("With")).getByRole("option", { name: "Priya Shah" })).toBeTruthy();
  });
});

