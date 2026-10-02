export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const WORK_MODE_LABELS: Record<WorkMode, string> = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" };

export const EMPLOYMENT_TYPES = ["full_time", "contract", "part_time"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  contract: "Contract",
  part_time: "Part-time",
};

export const SALARY_PERIODS = ["annual", "hourly"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];
export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = { annual: "Annual", hourly: "Hourly" };

// An optional "$", a whole number (plain, or with commas every three digits), then either
// nothing (dollars) or up to three decimal places and "k" (thousands).
const DOLLARS = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:(?:\.(\d{1,3}))?(k))?$/i;

/**
 * Reads a salary amount typed as "140000", "140,000", "$140,000", "140k", or "92.5K" as whole
 * US dollars (spec 003, AC-13). Returns undefined for anything else, such as "140.5" or "1.5m".
 */
export function parseDollars(text: string): number | undefined {
  const match = DOLLARS.exec(text.trim());
  if (!match) return undefined;
  const [, whole = "", decimals, k] = match;
  const units = Number(whole.replaceAll(",", ""));
  if (!k) return units;
  // Work in whole dollars so "92.5k" is exactly 92,500.
  return units * 1000 + Number((decimals ?? "").padEnd(3, "0"));
}

// A scheme such as "https:" or "mailto:". A colon followed by a digit is a port ("localhost:3000"), not a scheme.
const SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

/**
 * Trims a typed job link and adds "https://" when it has no scheme, so "jobs.acme.com/123"
 * becomes "https://jobs.acme.com/123" (spec 003, AC-12). Other schemes are left for validation to reject.
 */
export function normalizeJobLink(typed: string): string {
  const link = typed.trim();
  if (link === "" || SCHEME.test(link)) return link;
  return `https://${link}`;
}

/** True for an http or https web address that the browser can open. */
export function isValidJobLink(link: string): boolean {
  if (!URL.canParse(link)) return false;
  const { protocol, hostname } = new URL(link);
  return (protocol === "http:" || protocol === "https:") && hostname !== "";
}
