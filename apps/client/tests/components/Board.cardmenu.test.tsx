import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { application, installFakeServer } from "../support/fakeServer.ts";
import { AppAt } from "../support/render.tsx";

const column = (stage: string) => screen.getByRole("region", { name: stage });
const cardIn = (stage: string, name: RegExp) => within(column(stage)).queryByRole("button", { name: (accessible) => name.test(accessible) && !/^(Archive|Restore|Move):/.test(accessible) });

async function pick(stage: string) {
  await userEvent.click(await screen.findByRole("button", { name: /^Move: Engineer at Acme/ }));
  await userEvent.click(screen.getByRole("menuitem", { name: stage }));
}

function sidebarCount(stage: string) {
  const link = within(screen.getByRole("navigation", { name: "Stages" })).getByRole("link", { name: new RegExp(`^${stage}`) });
  return link.querySelector(".sidebar-count")?.textContent;
}

const acme = () => application({ companyName: "Acme", jobTitle: "Engineer", stage: "wishlist" });

describe("moving a card from its menu (spec 018)", () => {
  it("moves it, saves the new stage, and updates the sidebar (AC-8)", async () => {
    const server = installFakeServer([acme()]);
    render(<AppAt />);
    await screen.findByRole("button", { name: /^Move: Engineer at Acme/ });
    expect(sidebarCount("Applied")).toBe("0");

    await pick("Applied");

    await waitFor(() => {
      expect(cardIn("Applied", /Acme/)).not.toBeNull();
    });
    expect(cardIn("Wishlist", /Acme/)).toBeNull();
    expect(server.requests.filter((r) => r.method === "PUT")).toHaveLength(1);
    expect(server.applications[0]?.stage).toBe("applied");
    expect(sidebarCount("Applied")).toBe("1");
    expect(sidebarCount("Wishlist")).toBe("0");
    // A stage the board shows needs no message (AC-9).
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("takes the card off the board and says where it went when the stage is hidden (AC-9)", async () => {
    const server = installFakeServer([acme()]);
    render(<AppAt />);

    await pick("Rejected");

    const notice = await screen.findByRole("status");
    expect(notice.textContent).toContain("Moved Engineer to Rejected.");
    expect(screen.queryByRole("button", { name: /^Move: Engineer/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Rejected" })).toBeNull();
    expect(server.applications[0]?.stage).toBe("rejected");
    expect(sidebarCount("Rejected")).toBe("1");

    await userEvent.click(within(notice).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("puts the card back and shows the error when the save fails, with no moved message (AC-13)", async () => {
    const server = installFakeServer([acme()]);
    render(<AppAt />);
    await screen.findByRole("button", { name: /^Move: Engineer at Acme/ });
    server.setOffline(true);

    await pick("Rejected");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't move Engineer to Rejected");
    expect(cardIn("Wishlist", /Acme/)).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
