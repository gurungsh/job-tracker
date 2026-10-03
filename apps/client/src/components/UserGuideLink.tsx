import { BookOpen } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { originState } from "../lib/viewOrigin.ts";
import "./UserGuideLink.css";

/**
 * The header link to the guide (spec 020, AC-1, AC-7). It passes the screen I'm on, so the guide can lead back there
 * (AC-6). On the guide itself it passes on what the guide already has, so choosing it again keeps the way back. On a
 * narrow screen only the icon shows, and the name stays for screen readers.
 */
export function UserGuideLink({ compact }: { compact: boolean }) {
  const location = useLocation();
  const state: unknown = location.pathname === "/guide" ? location.state : originState(location);

  return (
    <NavLink to="/guide" state={state} className="user-guide-link" aria-label={compact ? "User Guide" : undefined}>
      <BookOpen size={16} aria-hidden="true" />
      {!compact && <span>User Guide</span>}
    </NavLink>
  );
}
