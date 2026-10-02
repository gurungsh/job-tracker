import { useSyncExternalStore } from "react";

/** A screen too narrow for the sidebar and the page side by side (spec 014, AC-8). The one place this width is written for the app shell. */
export const NARROW_QUERY = "(max-width: 52rem)";

/** Whether a media query matches, and follows it as the window changes. Reads as false where `matchMedia` doesn't exist. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}
