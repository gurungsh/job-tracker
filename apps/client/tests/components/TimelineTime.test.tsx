import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatTime } from "../../src/lib/dates.ts";
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

async function openTimeline(server = installFakeServer([acme])) {
  render(<AppAt path={`/applications/${String(acme.id)}`} />);
  await screen.findByRole("form", { name: "Add entry" });
  return server;
}

const section = () => within(screen.getByRole("region", { name: "Timeline" }));
const addForm = () => within(screen.getByRole("form", { name: "Add entry" }));
const texts = () => section().getAllByRole("listitem").map((item) => item.querySelector(".timeline-text")?.textContent);
const meta = (text: string) => section().getByText(text).closest(".timeline-body")?.querySelector(".timeline-meta")?.textContent;

describe("formatTime (spec 017, AC-10)", () => {
  it.each([
    ["14:30", "2:30 PM"],
    ["09:05", "9:05 AM"],
    ["00:00", "12:00 AM"],
    ["12:00", "12:00 PM"],
    ["23:59", "11:59 PM"],
  ])("writes %s as %s", (time, written) => {
    expect(formatTime(time)).toBe(written);
  });
});

describe("the Time field on the timeline's forms (spec 017, AC-9, AC-10)", () => {
  it("is optional beside Date: an entry without a time shows only its date", async () => {
    const server = await openTimeline();
    expect(addForm().getByLabelText<HTMLInputElement>("Time").value).toBe("");

    await userEvent.type(addForm().getByLabelText("What happened"), "Sent a thank-you note");
    await userEvent.click(addForm().getByRole("button", { name: "Log note" }));

    expect(await section().findByText("Sent a thank-you note")).toBeTruthy();
    expect(server.activities[0]?.occurredTime).toBeNull();
    expect(meta("Sent a thank-you note")).toBe("Oct 13, 2026");
  });

  it("saves a time and shows it after the date, then clears the field for the next entry", async () => {
    const server = await openTimeline();

    await userEvent.selectOptions(addForm().getByLabelText("Type"), "call");
    await userEvent.type(addForm().getByLabelText("Time"), "14:30");
    await userEvent.type(addForm().getByLabelText("What happened"), "Recruiter call");
    await userEvent.click(addForm().getByRole("button", { name: "Log call" }));

    expect(await section().findByText("Recruiter call")).toBeTruthy();
    expect(server.activities[0]?.occurredTime).toBe("14:30");
    expect(meta("Recruiter call")).toBe("Oct 13, 2026 · 2:30 PM");
    expect(addForm().getByLabelText<HTMLInputElement>("Time").value).toBe("");
  });

  it("shows the time on an entry that has one, and none on one that doesn't, including the automatic ones", async () => {
    const server = installFakeServer([acme]);
    server.activities.push(
      activity({ applicationId: acme.id, type: "interview", occurredOn: "2026-10-09", occurredTime: "09:00", text: "Onsite" }),
      activity({ applicationId: acme.id, type: "stage_change", occurredOn: "2026-10-01", text: "Added to Applied" }),
    );
    await openTimeline(server);

    expect(meta("Onsite")).toBe("Oct 9, 2026 · 9:00 AM");
    expect(meta("Added to Applied")).toBe("Oct 1, 2026");
  });

  it("sets, changes, and clears a time when editing, and an automatic entry gets one only if I enter it", async () => {
    const server = installFakeServer([acme]);
    server.activities.push(
      activity({ applicationId: acme.id, type: "stage_change", occurredOn: "2026-10-01", text: "Added to Applied" }),
    );
    await openTimeline(server);

    await userEvent.click(section().getByRole("button", { name: /^Edit entry: Added to Applied/ }));
    let form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.getByLabelText<HTMLInputElement>("Time").value).toBe("");
    await userEvent.type(form.getByLabelText("Time"), "08:15");
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(meta("Added to Applied")).toBe("Oct 1, 2026 · 8:15 AM");
    });
    expect(server.activities[0]?.occurredTime).toBe("08:15");

    await userEvent.click(section().getByRole("button", { name: /^Edit entry: Added to Applied/ }));
    form = within(screen.getByRole("form", { name: "Edit entry" }));
    expect(form.getByLabelText<HTMLInputElement>("Time").value).toBe("08:15");
    await userEvent.clear(form.getByLabelText("Time"));
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(meta("Added to Applied")).toBe("Oct 1, 2026");
    });
    expect(server.activities[0]?.occurredTime).toBeNull();
  });

  it("says when the server rejects a time, and keeps what I typed", async () => {
    const server = await openTimeline();
    server.override((method, path) =>
      method === "POST" && path.endsWith("/activities")
        ? new Response(JSON.stringify({ error: "Invalid activity", fields: { occurredTime: "Time must be a valid time" } }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        : undefined,
    );

    await userEvent.type(addForm().getByLabelText("Time"), "10:00");
    await userEvent.type(addForm().getByLabelText("What happened"), "Kept");
    await userEvent.click(addForm().getByRole("button", { name: "Log note" }));

    expect(await screen.findByText("Time must be a valid time")).toBeTruthy();
    expect(addForm().getByLabelText<HTMLInputElement>("What happened").value).toBe("Kept");
  });
});

describe("the order after a save (spec 017, AC-11)", () => {
  it("puts a timed entry before an untimed one on the same date, the later time first, and the newest added first among the untimed", async () => {
    const server = installFakeServer([acme]);
    server.activities.push(
      activity({ applicationId: acme.id, occurredOn: "2026-10-13", text: "untimed old" }),
      activity({ applicationId: acme.id, occurredOn: "2026-10-13", occurredTime: "09:00", text: "nine" }),
      activity({ applicationId: acme.id, occurredOn: "2026-10-14", text: "tomorrow" }),
    );
    await openTimeline(server);
    expect(texts()).toEqual(["tomorrow", "nine", "untimed old"]);

    await userEvent.type(addForm().getByLabelText("Time"), "15:30");
    await userEvent.type(addForm().getByLabelText("What happened"), "three thirty");
    await userEvent.click(addForm().getByRole("button", { name: "Log note" }));
    await section().findByText("three thirty");
    await userEvent.type(addForm().getByLabelText("What happened"), "untimed new");
    await userEvent.click(addForm().getByRole("button", { name: "Log note" }));
    await section().findByText("untimed new");

    expect(texts()).toEqual(["tomorrow", "three thirty", "nine", "untimed new", "untimed old"]);
  });
});
