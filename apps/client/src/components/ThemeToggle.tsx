import { useTheme } from "../lib/theme.ts";
import "./ThemeToggle.css";

/** Switches between the light and dark theme. Named for the theme it will switch to (spec 010, AC-1). */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button type="button" className="theme-toggle" onClick={toggle}>
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span> {dark ? "Light theme" : "Dark theme"}
    </button>
  );
}
