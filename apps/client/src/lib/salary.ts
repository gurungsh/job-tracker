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
