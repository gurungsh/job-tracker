const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/** Today's date on this computer, as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  return toIsoDate(now);
}

/** The local date (YYYY-MM-DD) of an ISO timestamp. */
export function localDateOf(timestamp: string): string {
  return toIsoDate(new Date(timestamp));
}

/** A due date is overdue only once it's in the past. Today isn't overdue. */
export function isOverdue(due: string, today: string): boolean {
  return due < today;
}

/** Whole calendar days from the local date the stage changed to today. */
export function daysInStage(stageChangedAt: string, now = new Date()): number {
  return dayNumber(localToday(now)) - dayNumber(localDateOf(stageChangedAt));
}

export function timeInStage(stageLabel: string, days: number): string {
  if (days <= 0) return `In ${stageLabel} since today`;
  return `In ${stageLabel} for ${String(days)} ${days === 1 ? "day" : "days"}`;
}

/** How long a card has been in its stage, for the card's footer: "Today", "1 day", "5 days" (spec 011, AC-9). */
export function shortTimeInStage(days: number): string {
  if (days <= 0) return "Today";
  return days === 1 ? "1 day" : `${String(days)} days`;
}

/** "2026-10-01" → "Oct 1, 2026" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(year ?? 0, (month ?? 1) - 1, day ?? 1),
  );
}

/** Days since the epoch for a YYYY-MM-DD date, ignoring time zones and daylight saving. */
function dayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / DAY_MS;
}
