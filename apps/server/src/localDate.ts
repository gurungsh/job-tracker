/**
 * The calendar date (YYYY-MM-DD) at `now` in `timeZone`, an IANA zone such as "America/Chicago".
 * A missing or unknown zone falls back to the server's own time zone.
 */
export function localDate(now: Date, timeZone: string | undefined): string {
  let format: Intl.DateTimeFormat;
  try {
    // en-CA formats dates as YYYY-MM-DD.
    format = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || undefined });
  } catch {
    format = new Intl.DateTimeFormat("en-CA");
  }
  return format.format(now);
}
