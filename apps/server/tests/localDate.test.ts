import { describe, expect, it } from "vitest";
import { localDate } from "../src/localDate.ts";

// 9:30 p.m. on Sept. 30 in Chicago is already Oct. 1 in UTC.
const chicagoEvening = new Date("2026-10-01T02:30:00Z");

describe("localDate", () => {
  it("uses the given time zone", () => {
    expect(localDate(chicagoEvening, "America/Chicago")).toBe("2026-09-30");
    expect(localDate(chicagoEvening, "UTC")).toBe("2026-10-01");
    expect(localDate(chicagoEvening, "Asia/Tokyo")).toBe("2026-10-01");
  });

  it("falls back to the server's time zone when the zone is missing or unknown", () => {
    const serverDate = localDate(chicagoEvening, Intl.DateTimeFormat().resolvedOptions().timeZone);

    expect(localDate(chicagoEvening, undefined)).toBe(serverDate);
    expect(localDate(chicagoEvening, "")).toBe(serverDate);
    expect(localDate(chicagoEvening, "Not/AZone")).toBe(serverDate);
  });
});
