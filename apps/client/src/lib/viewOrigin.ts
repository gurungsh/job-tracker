/** Where the detail page sends me back to: the board, or the table with its search, filters, and sort (spec 013, AC-8, AC-9). */
export type ViewOrigin = { path: string; label: "Back to board" | "Back to table" };

const BOARD: ViewOrigin = { path: "/", label: "Back to board" };

/** The router state a card or row passes when it opens the page, saying which view it was opened from. */
export function originState(location: { pathname: string; search: string }): { from: string } {
  return { from: location.pathname + location.search };
}

/**
 * Reads that state back. Only the board or the table is accepted, so anything else, including no state at all as when
 * the address is opened directly, goes to the board (spec 013, AC-10).
 */
export function readOrigin(state: unknown): ViewOrigin {
  const from = typeof state === "object" && state !== null && "from" in state ? state.from : undefined;
  if (typeof from !== "string") return BOARD;
  if (from === "/table" || from.startsWith("/table?")) return { path: from, label: "Back to table" };
  if (from === "/" || from.startsWith("/?")) return { path: from, label: "Back to board" };
  return BOARD;
}

/** Where the guide's back link goes: the board, the table, or an application's page (spec 020, AC-6). */
export type GuideOrigin = { path: string; label: "Back to board" | "Back to table" | "Back to application" };

/**
 * Reads the state the header's guide link passes. Only the board, the table, or an application's page is accepted, so
 * anything else, including no state at all as when the guide is opened directly, goes to the board (spec 020, AC-6).
 */
export function readGuideOrigin(state: unknown): GuideOrigin {
  const from = typeof state === "object" && state !== null && "from" in state ? state.from : undefined;
  if (typeof from === "string" && /^\/applications\/\d+$/.test(from)) return { path: from, label: "Back to application" };
  return readOrigin(state);
}
