import { type SalaryPeriod } from "@job-tracker/shared";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const PER: Record<SalaryPeriod, string> = { annual: "per year", hourly: "per hour" };

/** 140000 → "$140,000" */
export function formatDollars(amount: number): string {
  return dollars.format(amount);
}

/** A readable salary range, such as "$140,000–$170,000 per year" (spec 003, AC-5). Empty without an amount. */
export function salarySummary(min: number | null, max: number | null, period: SalaryPeriod | null): string {
  let range: string;
  if (min !== null && max !== null) {
    range = min === max ? formatDollars(min) : `${formatDollars(min)}–${formatDollars(max)}`;
  } else if (min !== null) {
    range = `From ${formatDollars(min)}`;
  } else if (max !== null) {
    range = `Up to ${formatDollars(max)}`;
  } else {
    return "";
  }
  return period ? `${range} ${PER[period]}` : range;
}

const SHORT_PER: Record<SalaryPeriod, string> = { annual: "/yr", hourly: "/hr" };

/** 140000 → "$140k", 85 → "$85", 92500 → "$92,500". A whole number of thousands from $1,000 up gets a "k". */
function shortDollars(amount: number): string {
  return amount >= 1000 && amount % 1000 === 0 ? `$${String(amount / 1000)}k` : formatDollars(amount);
}

/** A short salary range for a card, such as "$140k–$170k/yr" or "From $85/hr" (spec 011, AC-7). Empty without an amount. */
export function compactSalary(min: number | null, max: number | null, period: SalaryPeriod | null): string {
  let range: string;
  if (min !== null && max !== null) {
    range = min === max ? shortDollars(min) : `${shortDollars(min)}–${shortDollars(max)}`;
  } else if (min !== null) {
    range = `From ${shortDollars(min)}`;
  } else if (max !== null) {
    range = `Up to ${shortDollars(max)}`;
  } else {
    return "";
  }
  return period ? `${range}${SHORT_PER[period]}` : range;
}

/**
 * A salary written in full for an application's page, such as "$85,000 – $95,000/yr" or "$85/hr" (spec 016, AC-10).
 * Empty without an amount. The form's own summary and the cards' wording are separate (specs 003 and 011).
 */
export function payLine(min: number | null, max: number | null, period: SalaryPeriod | null): string {
  let range: string;
  if (min !== null && max !== null) {
    range = min === max ? formatDollars(min) : `${formatDollars(min)} – ${formatDollars(max)}`;
  } else if (min !== null) {
    range = `From ${formatDollars(min)}`;
  } else if (max !== null) {
    range = `Up to ${formatDollars(max)}`;
  } else {
    return "";
  }
  return period ? `${range}${SHORT_PER[period]}` : range;
}

