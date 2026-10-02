import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAt } from "../support/render.tsx";
import { activity, application, installFakeServer } from "../support/fakeServer.ts";

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
    await userEvent.type(form.getByLabelText("Text"), "Onsite with the team");
    await userEvent.click(form.getByRole("button", { name: "Add entry" }));

    const item = await section().findByRole("listitem");
    expect(item.textContent).toContain("Interview");
    expect(item.textContent).toContain("Oct 20, 2026");
    expect(item.textContent).toContain("Onsite with the team");
    expect(server.activities).toEqual([
      expect.objectContaining({ applicationId: acme.id, type: "interview", occurredOn: "2026-10-20", text: "Onsite with the team" }),
    ]);
    expect(form.getByLabelText<HTMLTextAreaElement>("Text").value).toBe("");
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

    await userEvent.type(form.getByLabelText("Text"), "middle");
    await userEvent.click(form.getByRole("button", { name: "Add entry" }));

    await waitFor(() => {
      expect(section().getAllByRole("listitem")).toHaveLength(3);
    });
    const texts = section().getAllByRole("listitem").map((i) => i.querySelector(".timeline-text")?.textContent);
    expect(texts).toEqual(["later", "middle", "earlier"]);
  });

  it("explains empty text and bad dates next to the field, and sends nothing (AC-4)", async () => {
    const { server } = await openTimeline();
    const form = within(addForm());

    await userEvent.click(form.getByRole("button", { name: "Add entry" }));
    expect(form.getByText("Text is required")).toBeTruthy();

    await userEvent.type(form.getByLabelText("Text"), "x");
    await userEvent.clear(form.getByLabelText("Date"));
    await userEvent.click(form.getByRole("button", { name: "Add entry" }));
    expect(form.getByText("Date must be a valid date")).toBeTruthy();
    expect(server.requests.filter((r) => r.method === "POST")).toHaveLength(0);
  });

  it("rejects text over the limit (AC-4)", async () => {
    await openTimeline();
    const form = within(addForm());

    await userEvent.click(form.getByLabelText("Text"));
    await userEvent.paste("x".repeat(5001));
    await userEvent.click(form.getByRole("button", { name: "Add entry" }));

    expect(form.getByText("Text must be 5,000 characters or fewer")).toBeTruthy();
  });

  it("keeps what I typed when adding fails, and says why (AC-13)", async () => {
    const { server } = await openTimeline();
    const form = within(addForm());
    await userEvent.type(form.getByLabelText("Text"), "Don't lose me");
    server.setOffline(true);

    await userEvent.click(form.getByRole("button", { name: "Add entry" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't save the entry");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(form.getByLabelText<HTMLTextAreaElement>("Text").value).toBe("Don't lose me");
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

    await userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: "Edit" }));
    const form = within(screen.getByRole("form", { name: "Edit entry" }));
    await userEvent.selectOptions(form.getByLabelText("Type"), "email");
    await userEvent.clear(form.getByLabelText("Text"));
    await userEvent.type(form.getByLabelText("Text"), "Sent a thank-you");
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

    await userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: "Edit" }));
    await userEvent.type(within(screen.getByRole("form", { name: "Edit entry" })).getByLabelText("Text"), " more");
    await userEvent.click(within(screen.getByRole("form", { name: "Edit entry" })).getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Recruiter call")).toBeTruthy();
    expect(server.activities[0]?.text).toBe("Recruiter call");
  });

  it("lets a stage change be edited, but keeps its type (AC-8)", async () => {
    const server = withEntries();
    await openTimeline(server);

    await userEvent.click(within(section().getAllByRole("listitem")[1] as HTMLElement).getByRole("button", { name: "Edit" }));
    const form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.queryByLabelText("Type")).toBeNull();
    await userEvent.clear(form.getByLabelText("Text"));
    await userEvent.type(form.getByLabelText("Text"), "Found it on LinkedIn");
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
      userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: "Delete" }));

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
    await userEvent.click(within(section().getAllByRole("listitem")[0] as HTMLElement).getByRole("button", { name: "Delete" }));
    server.setOffline(true);

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't delete the entry");
    expect(screen.getByText("Recruiter call")).toBeTruthy();
  });
});
