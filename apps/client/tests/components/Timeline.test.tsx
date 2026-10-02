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

/** Opens Acme's page, where the timeline is a section (spec 013, AC-12). */
async function openTimeline(server = installFakeServer([acme])) {
  render(<AppAt path={`/applications/${String(acme.id)}`} />);
  await screen.findByRole("form", { name: "Add entry" });
  return { server, panel: screen.getByRole("region", { name: "Timeline" }) };
}

const section = () => within(screen.getByRole("region", { name: "Timeline" }));

const addForm = () => screen.getByRole("form", { name: "Add entry" });

describe("the timeline", () => {
  it("says there are no entries yet for an application without any (AC-10)", async () => {
    await openTimeline();

    expect(screen.getByText(/No entries yet/)).toBeTruthy();
  });

  it("lists entries as the server sends them, with type, date, and text (AC-3)", async () => {
    const server = installFakeServer([acme]);
    server.activities.push(
      activity({ applicationId: acme.id, type: "call", occurredOn: "2026-10-09", text: "Line one\nLine two" }),
      activity({ applicationId: acme.id, type: "stage_change", occurredOn: "2026-10-01", text: "Added to Applied" }),
      activity({ applicationId: acme.id + 1, text: "someone else's" }),
    );

    await openTimeline(server);

    const items = section().getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain("Call");
    expect(items[0]?.textContent).toContain("Oct 9, 2026");
    expect(items[0]?.querySelector(".timeline-text")?.textContent).toBe("Line one\nLine two");
    expect(items[1]?.textContent).toContain("Stage change");
    expect(screen.queryByText("someone else's")).toBeNull();
  });

  it("adds an entry at the top, clears the form, and sets the date back to today (AC-2)", async () => {
    const { server } = await openTimeline();
    const form = within(addForm());
    expect(form.getByLabelText<HTMLInputElement>("Date").value).toBe("2026-10-13");

    await userEvent.selectOptions(form.getByLabelText("Type"), "interview");
    await userEvent.clear(form.getByLabelText("Date"));
    await userEvent.type(form.getByLabelText("Date"), "2026-10-20");
    await userEvent.type(form.getByLabelText("What happened"), "Onsite with the team");
    await userEvent.click(form.getByRole("button", { name: /^Log / }));

    const item = await section().findByRole("listitem");
    expect(item.textContent).toContain("Interview");
    expect(item.textContent).toContain("Oct 20, 2026");
    expect(item.textContent).toContain("Onsite with the team");
    expect(server.activities).toEqual([
      expect.objectContaining({ applicationId: acme.id, type: "interview", occurredOn: "2026-10-20", text: "Onsite with the team" }),
    ]);
    expect(form.getByLabelText<HTMLTextAreaElement>("What happened").value).toBe("");
    expect(form.getByLabelText<HTMLInputElement>("Date").value).toBe("2026-10-13");
  });

  it("puts a new entry in date order among the others (AC-3)", async () => {
    const server = installFakeServer([acme]);
    server.activities.push(
      activity({ applicationId: acme.id, occurredOn: "2026-10-20", text: "later" }),
      activity({ applicationId: acme.id, occurredOn: "2026-10-01", text: "earlier" }),
    );
    await openTimeline(server);
    const form = within(addForm());

    await userEvent.type(form.getByLabelText("What happened"), "middle");
    await userEvent.click(form.getByRole("button", { name: /^Log / }));

    await waitFor(() => {
      expect(section().getAllByRole("listitem")).toHaveLength(3);
    });
    const texts = section().getAllByRole("listitem").map((i) => i.querySelector(".timeline-text")?.textContent);
    expect(texts).toEqual(["later", "middle", "earlier"]);
  });

  it("explains empty text and bad dates next to the field, and sends nothing (AC-4)", async () => {
    const { server } = await openTimeline();
    const form = within(addForm());

    await userEvent.click(form.getByRole("button", { name: /^Log / }));
    expect(form.getByText("Text is required")).toBeTruthy();

    await userEvent.type(form.getByLabelText("What happened"), "x");
    await userEvent.clear(form.getByLabelText("Date"));
    await userEvent.click(form.getByRole("button", { name: /^Log / }));
    expect(form.getByText("Date must be a valid date")).toBeTruthy();
    expect(server.requests.filter((r) => r.method === "POST")).toHaveLength(0);
  });

  it("rejects text over the limit (AC-4)", async () => {
    await openTimeline();
    const form = within(addForm());

    await userEvent.click(form.getByLabelText("What happened"));
    await userEvent.paste("x".repeat(5001));
    await userEvent.click(form.getByRole("button", { name: /^Log / }));

    expect(form.getByText("Text must be 5,000 characters or fewer")).toBeTruthy();
  });

  it("keeps what I typed when adding fails, and says why (AC-13)", async () => {
    const { server } = await openTimeline();
    const form = within(addForm());
    await userEvent.type(form.getByLabelText("What happened"), "Don't lose me");
    server.setOffline(true);

    await userEvent.click(form.getByRole("button", { name: /^Log / }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't save the entry");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(form.getByLabelText<HTMLTextAreaElement>("What happened").value).toBe("Don't lose me");
  });

  it("shows an error with a way to try again when loading fails (AC-13)", async () => {
    const server = installFakeServer([acme]);
    let down = true;
    server.override((method, path) =>
      down && method === "GET" && path.endsWith("/activities")
        ? new Response(JSON.stringify({ error: "Service down" }), { status: 503 })
        : undefined,
    );
    render(<AppAt path={`/applications/${String(acme.id)}`} />);

    const alert = await within(await screen.findByRole("region", { name: "Timeline" })).findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the timeline");

    down = false;
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("form", { name: "Add entry" })).toBeTruthy();
  });
});

describe("editing and deleting", () => {
  function withEntries() {
    const server = installFakeServer([acme]);
    server.activities.push(
      activity({ applicationId: acme.id, type: "call", occurredOn: "2026-10-09", text: "Recruiter call" }),
      activity({ applicationId: acme.id, type: "stage_change", occurredOn: "2026-10-01", text: "Added to Applied" }),
    );
    return server;
  }

  it("changes the date, text, and type of a logged entry (AC-8)", async () => {
    const server = withEntries();
    await openTimeline(server);

    await userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    const form = within(screen.getByRole("form", { name: "Edit entry" }));
    await userEvent.selectOptions(form.getByLabelText("Type"), "email");
    await userEvent.clear(form.getByLabelText("What happened"));
    await userEvent.type(form.getByLabelText("What happened"), "Sent a thank-you");
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Edit entry" })).toBeNull();
    });
    const first = section().getAllByRole("listitem")[0] as HTMLElement;
    expect(first.textContent).toContain("Email");
    expect(first.textContent).toContain("Sent a thank-you");
    expect(server.activities[0]).toMatchObject({ type: "email", text: "Sent a thank-you" });
  });

  it("discards changes on Cancel (AC-8)", async () => {
    const server = withEntries();
    await openTimeline(server);

    await userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    await userEvent.type(within(screen.getByRole("form", { name: "Edit entry" })).getByLabelText("What happened"), " more");
    await userEvent.click(within(screen.getByRole("form", { name: "Edit entry" })).getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Recruiter call")).toBeTruthy();
    expect(server.activities[0]?.text).toBe("Recruiter call");
  });

  it("lets a stage change be edited, but keeps its type (AC-8)", async () => {
    const server = withEntries();
    await openTimeline(server);

    await userEvent.click(within(section().getAllByRole("listitem")[1] as HTMLElement).getByRole("button", { name: /^Edit / }));
    const form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.queryByLabelText("Type")).toBeNull();
    await userEvent.clear(form.getByLabelText("What happened"));
    await userEvent.type(form.getByLabelText("What happened"), "Found it on LinkedIn");
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(server.activities[1]).toMatchObject({ type: "stage_change", text: "Found it on LinkedIn" });
    });
    expect(server.requests.find((r) => r.method === "PUT")?.body).not.toHaveProperty("type");
  });

  it("deletes only after I confirm (AC-9)", async () => {
    const server = withEntries();
    await openTimeline(server);
    const deleteFirst = () =>
      userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: /^Delete/ }));

    await deleteFirst();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(server.activities).toHaveLength(2);

    await deleteFirst();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Recruiter call")).toBeNull();
    });
    expect(server.activities).toHaveLength(1);
  });

  it("says why a delete failed and keeps the entry (AC-13)", async () => {
    const server = withEntries();
    await openTimeline(server);
    await userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: /^Delete/ }));
    server.setOffline(true);

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't delete the entry");
    expect(screen.getByText("Recruiter call")).toBeTruthy();
  });
});

describe("the Timeline card's form and entries (spec 016, AC-1, AC-4, AC-5, AC-7, AC-8)", () => {
  function withEntries() {
    const server = installFakeServer([acme]);
    server.contacts.push(contact({ companyId: acme.companyId, name: "Priya Shah" }));
    server.activities.push(
      activity({ applicationId: acme.id, type: "call", occurredOn: "2026-10-09", text: "Technical interview booked", contactId: server.contacts[0]?.id ?? null, contactName: "Priya Shah" }),
      activity({ applicationId: acme.id, type: "stage_change", occurredOn: "2026-10-01", text: "Moved from Screening to Interviewing" }),
    );
    return server;
  }

  it("is a card with its own heading (AC-1)", async () => {
    await openTimeline();

    expect(screen.getByRole("heading", { level: 3, name: "Timeline" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Timeline" })).toBeTruthy();
  });

  it("shows Type, With, and Date in a row, then What happened, with a hint, as the form (AC-7)", async () => {
    await openTimeline();
    const fields = addForm().querySelector(".entry-fields") as HTMLElement;

    expect([...fields.querySelectorAll("label")].map((label) => label.textContent)).toEqual(["Type", "With", "Date"]);
    const text = within(addForm()).getByLabelText<HTMLTextAreaElement>("What happened");
    expect(text.placeholder).toBe("Anything worth remembering…");
    expect(addForm().querySelector(".entry-fields")?.nextElementSibling?.contains(text)).toBe(true);
  });

  it("names the button for the chosen type: Log note, Log email, Log call, Log interview (AC-7)", async () => {
    await openTimeline();
    const form = within(addForm());
    expect(form.getByRole("button", { name: "Log note" })).toBeTruthy();

    for (const [type, name] of [["Email", "Log email"], ["Call", "Log call"], ["Interview", "Log interview"], ["Note", "Log note"]] as const) {
      await userEvent.selectOptions(form.getByLabelText("Type"), type);
      expect(form.getByRole("button", { name }), name).toBeTruthy();
    }
  });

  it("still logs the entry with the same rules, and the button goes on saying Log note (AC-7, AC-13)", async () => {
    const { server } = await openTimeline();
    const form = within(addForm());

    await userEvent.type(form.getByLabelText("What happened"), "Sent my portfolio");
    await userEvent.click(form.getByRole("button", { name: "Log note" }));

    await waitFor(() => {
      expect(server.activities[0]).toMatchObject({ type: "note", text: "Sent my portfolio" });
    });
    expect(form.getByRole("button", { name: "Log note" })).toBeTruthy();
  });

  it("gives each entry an icon named for its type, its text, and a muted date line with the contact (AC-8)", async () => {
    await openTimeline(withEntries());
    await section().findAllByRole("listitem");
    const [call, change] = section().getAllByRole("listitem") as [HTMLElement, HTMLElement];

    expect(call.querySelector(".timeline-mark svg")).not.toBeNull();
    expect(call.querySelector(".timeline-mark .visually-hidden")?.textContent).toBe("Call");
    expect(call.querySelector(".timeline-text")?.textContent).toBe("Technical interview booked");
    expect(call.querySelector(".timeline-meta")?.textContent).toBe("Oct 9, 2026 · with Priya Shah");
    expect(change.querySelector(".timeline-mark .visually-hidden")?.textContent).toBe("Stage change");
    expect(change.querySelector(".timeline-meta")?.textContent).toBe("Oct 1, 2026");
    expect(change.querySelector(".timeline-meta .timeline-contact")).toBeNull();
  });

  it("gives every entry, a stage change too, an Edit and a ✕ named for it (AC-4)", async () => {
    await openTimeline(withEntries());
    await section().findAllByRole("listitem");

    expect(section().getAllByRole("button", { name: /^Edit / })).toHaveLength(2);
    expect(section().getAllByRole("button", { name: /^Delete entry:/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Delete entry: Technical interview booked",
      "Delete entry: Moved from Screening to Interviewing",
    ]);
  });

  it("asks before deleting with the same wording, and Escape deletes nothing (AC-5)", async () => {
    const server = withEntries();
    await openTimeline(server);
    await section().findAllByRole("listitem");

    await userEvent.click(section().getByRole("button", { name: "Delete entry: Technical interview booked" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete this entry?" });
    expect(confirm.textContent).toContain('"Technical interview booked" will be removed from the timeline.');
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(server.activities).toHaveLength(2);
  });

  it("keeps a half-typed edit when I choose Edit on another entry (edge case)", async () => {
    await openTimeline(withEntries());
    await section().findAllByRole("listitem");
    const [first, second] = section().getAllByRole("listitem") as [HTMLElement, HTMLElement];

    await userEvent.click(within(first).getByRole("button", { name: /^Edit / }));
    await userEvent.type(within(screen.getByRole("form", { name: "Edit entry" })).getByLabelText("What happened"), " and more");
    await userEvent.click(within(second).getByRole("button", { name: /^Edit / }));

    const forms = screen.getAllByRole("form", { name: "Edit entry" });
    expect(forms).toHaveLength(2);
    expect(within(forms[0] as HTMLElement).getByLabelText<HTMLTextAreaElement>("What happened").value).toBe("Technical interview booked and more");
    // A stage change keeps its type, so its form has no Type field.
    expect(within(forms[1] as HTMLElement).queryByLabelText("Type")).toBeNull();
  });
});

