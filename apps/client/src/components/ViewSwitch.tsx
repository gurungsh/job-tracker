import { NavLink, useLocation } from "react-router";
import "./ViewSwitch.css";

/** Moves between the board and the table, taking the table's search, filters, and sort along (spec 012, AC-2, AC-15). */
export function ViewSwitch() {
  const { search } = useLocation();
  return (
    <nav className="view-switch" aria-label="View">
      <NavLink to={{ pathname: "/", search }} end>
        Kanban
      </NavLink>
      <NavLink to={{ pathname: "/table", search }}>Table</NavLink>
    </nav>
  );
}
