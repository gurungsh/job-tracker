import { BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router";
import { originState, readGuideOrigin } from "../lib/viewOrigin.ts";
import "./UserGuideLink.css";

/**
 * The header button for the guide (spec 020, AC-1, AC-7). It passes the screen I'm on, so the guide can lead back there.
 * On the guide it is highlighted, and choosing it again goes back to that screen (spec 021, AC-8, AC-9). On a
 * narrow screen only the icon shows, and the name stays for screen readers.
 */
export function UserGuideLink({ compact }: { compact: boolean }) {
  const location = useLocation();
  const onGuide = location.pathname === "/guide";

  return (
    <Link
      to={onGuide ? readGuideOrigin(location.state).path : "/guide"}
      state={onGuide ? undefined : originState(location)}
      className={onGuide ? "user-guide-link user-guide-link--active" : "user-guide-link"}
      aria-current={onGuide ? "page" : undefined}
      aria-label={compact ? "User Guide" : undefined}
    >
      <BookOpen size={16} aria-hidden="true" />
      {!compact && <span>User Guide</span>}
    </Link>
  );
}
