import { STAGE_LABELS, STAGES, type Stage } from "@job-tracker/shared";
import { List, Plus } from "lucide-react";
import type { Ref } from "react";
import { Link, useLocation } from "react-router";
import { STAGE_ICONS } from "../lib/stageIcons.ts";
import { stageCounts } from "../lib/stageCounts.ts";
import { parseTableQuery, toSearchParams } from "../lib/tableQuery.ts";
import { useApplicationsStore } from "../lib/useApplications.tsx";
import "./Sidebar.css";

const number = new Intl.NumberFormat("en-US");

/** The table with only this stage as its filter, so the search, other filters, and sort are cleared (spec 014, AC-4). */
function stageAddress(stage: Stage): string {
  const params = toSearchParams({ search: "", stages: [stage], workModes: [], employmentTypes: [], sort: null });
  return `/table?${params.toString()}`;
}

/**
 * Every stage with its count, and "All applications" with the total, each opening the table (spec 014, AC-1 to AC-5, AC-7).
 * `onNavigate` is called when an entry is chosen, so a drawer can close. The Add application button is first, above the
 * stage list and outside the navigation, since it does something rather than going somewhere (spec 015, AC-1).
 */
export function Sidebar({
  onNavigate,
  onAdd,
  addRef,
}: {
  onNavigate?: () => void;
  onAdd: () => void;
  addRef?: Ref<HTMLButtonElement>;
}) {
  const { state } = useApplicationsStore();
  const { pathname, search } = useLocation();
  // Counts are left out until the list is loaded, or if it couldn't be, rather than showing wrong ones (AC-7).
  const counts = state.status === "ready" ? stageCounts(state.applications) : null;
  const total = state.status === "ready" ? state.applications.length : null;

  // Only the table's stage filter selects an entry, whatever else is set (AC-5).
  const chosen = pathname === "/table" ? parseTableQuery(new URLSearchParams(search)).stages : undefined;
  const allSelected = chosen?.length === 0;
  const selectedStage = chosen?.length === 1 ? chosen[0] : undefined;

  return (
    <div className="sidebar">
      <button ref={addRef} type="button" className="primary sidebar-add" onClick={onAdd}>
        <Plus size={16} aria-hidden="true" />
        Add application
      </button>
      <nav aria-label="Stages">
        <ul>
          <li>
            <Link
              to="/table"
              className="sidebar-entry"
              aria-current={allSelected ? "page" : undefined}
              onClick={onNavigate}
            >
              <List size={16} aria-hidden="true" />
              <span className="sidebar-name">All applications</span>
              {total !== null && <span className="sidebar-count">{number.format(total)}</span>}
            </Link>
          </li>
          {STAGES.map((stage) => {
            const Icon = STAGE_ICONS[stage];
            return (
              <li key={stage}>
                <Link
                  to={stageAddress(stage)}
                  className="sidebar-entry"
                  data-stage={stage}
                  aria-current={selectedStage === stage ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="sidebar-name sidebar-name--stage">{STAGE_LABELS[stage]}</span>
                  {counts && <span className="sidebar-count">{number.format(counts[stage])}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
