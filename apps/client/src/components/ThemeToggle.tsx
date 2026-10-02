import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme.ts";
import "./ThemeToggle.css";

/**
 * Switches between the light and dark theme. It shows a sun and a moon in a pill, with the current theme on a filled
 * disc (spec 016, AC-11). It is still named for the theme it will switch to (spec 010, AC-1), in text only screen
 * readers see.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button type="button" className="theme-toggle" onClick={toggle}>
      <span className={dark ? "theme-option" : "theme-option theme-option--current"} aria-hidden="true">
        <Sun size={16} />
      </span>
      <span className={dark ? "theme-option theme-option--current" : "theme-option"} aria-hidden="true">
        <Moon size={16} />
      </span>
      <span className="visually-hidden">{dark ? "Light theme" : "Dark theme"}</span>
    </button>
  );
}
