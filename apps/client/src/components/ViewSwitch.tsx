import { Columns3, Table2 } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import "./ViewSwitch.css";

/** Moves between the board and the table, taking the table's search, filters, and sort along (spec 012, AC-2, AC-15). */
export function ViewSwitch() {
  const { search } = useLocation();
  return (
    <nav className="view-switch" aria-label="View">
      <NavLink to={{ pathname: "/", search }} end>
        <Columns3 size={16} aria-hidden="true" />
        Kanban View
      </NavLink>
      <NavLink to={{ pathname: "/table", search }}>
        <Table2 size={16} aria-hidden="true" />
        Table View
      </NavLink>
    </nav>
  );
}
