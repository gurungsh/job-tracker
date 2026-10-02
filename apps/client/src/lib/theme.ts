import { useCallback, useEffect, useRef, useState } from "react";

export type Theme = "light" | "dark";

/** The browser setting that holds my choice. public/theme-init.js reads the same one. */
export const THEME_KEY = "job-tracker-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The saved choice, or null when there is none, it isn't valid, or storage is blocked (spec 010, AC-7). */
export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

/** The device's setting. */
export function systemTheme(): Theme {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The theme showing now: what theme-init.js set on <html>, or what it would have set. */
export function currentTheme(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  return set === "light" || set === "dark" ? set : (readStoredTheme() ?? systemTheme());
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage is blocked. The choice lasts until the page is reloaded (spec 010, AC-7).
  }
}

/** The theme showing, and a way to flip it. Follows the device until a choice is made (spec 010, AC-3, AC-6). */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState(currentTheme);
  const chosen = useRef(readStoredTheme() !== null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (chosen.current) return;
      const next = systemTheme();
      applyTheme(next);
      setTheme(next);
    };
    query.addEventListener("change", onChange);
    return () => {
      query.removeEventListener("change", onChange);
    };
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    chosen.current = true;
    applyTheme(next);
    storeTheme(next);
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
