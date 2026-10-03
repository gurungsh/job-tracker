import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  STAGES,
  STAGE_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type Application,
} from "@job-tracker/shared";
import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { daysInStage, formatDate, isOverdue, localToday, shortTimeInStage } from "../lib/dates.ts";
import { useArchiveActions } from "../lib/useArchiveActions.ts";
import { employmentLabel } from "../lib/jobSummary.ts";
import { compactSalary } from "../lib/salary.ts";
import { STAGE_ICONS } from "../lib/stageIcons.ts";
import { type SortColumn, type TableQuery, parseTableQuery, toSearchParams } from "../lib/tableQuery.ts";
import { filterApplications, sortApplications } from "../lib/tableRows.ts";
import { useApplicationsContext } from "../lib/useApplications.tsx";
import { useOpenApplication } from "../lib/useOpenApplication.ts";
import { ArchiveButton } from "./ArchiveButton.tsx";
import { FilterDropdown } from "./FilterDropdown.tsx";
import "./TableView.css";

const EMPTY = "–";

/** Text that is cut off with "…" when it is too long for its column, and shows in full when pointed at (spec 012, AC-21). */
function Text({ value }: { value: string | null }) {
  if (!value) return <>{EMPTY}</>;
  return (
    <span className="cell-text" title={value}>
      {value}
    </span>
  );
}

function NextStep({ application, today }: { application: Application; today: string }) {
  const { nextStep, nextStepDue } = application;
  if (!nextStep && !nextStepDue) return <>{EMPTY}</>;
  const overdue = nextStepDue !== null && isOverdue(nextStepDue, today);
  return (
    <span className="cell-next">
      {nextStep && <Text value={nextStep} />}
      {nextStepDue && (
        <span className={overdue ? "cell-due cell-due--overdue" : "cell-due"}>
          {overdue && <strong>Overdue</strong>} {formatDate(nextStepDue)}
        </span>
      )}
    </span>
  );
}

function Row({
  application,
  today,
  onOpen,
  onArchive,
  restore,
}: {
  application: Application;
  today: string;
  onOpen: (a: Application) => void;
  /** Archives the row's application, or restores it in the Archived view (spec 017, AC-2, AC-5). */
  onArchive: (a: Application) => void;
  restore: boolean;
}) {
  const StageIcon = STAGE_ICONS[application.stage];
  const pay = compactSalary(application.salaryMin, application.salaryMax, application.salaryPeriod);
  return (
    <tr
      onClick={() => {
        onOpen(application);
      }}
    >
      <td>
        <Text value={application.companyName} />
      </td>
      <td>
        <button
          type="button"
          className="table-link"
          onClick={(event) => {
            // The row opens the panel too, so this keeps it to one open.
            event.stopPropagation();
            onOpen(application);
          }}
        >
          <Text value={application.jobTitle} />
        </button>
      </td>
      <td>
        <span className="cell-stage" data-stage={application.stage}>
          <StageIcon size={16} aria-hidden="true" /> {STAGE_LABELS[application.stage]}
        </span>
      </td>
      <td>
        <Text value={application.location} />
      </td>
      <td>{application.workMode ? WORK_MODE_LABELS[application.workMode] : EMPTY}</td>
      <td>
        <Text value={employmentLabel(application) || null} />
      </td>
      <td>{pay || EMPTY}</td>
      <td>
        <NextStep application={application} today={today} />
      </td>
      <td>
        <span className="cell-age">
          <Clock size={14} aria-hidden="true" /> {shortTimeInStage(daysInStage(application.stageChangedAt))}
        </span>
      </td>
      <td className="cell-actions">
        <ArchiveButton application={application} restore={restore} onClick={onArchive} />
      </td>
    </tr>
  );
}

const COLUMNS: { column: SortColumn; label: string }[] = [
  { column: "company", label: "Company" },
  { column: "title", label: "Job title" },
  { column: "stage", label: "Stage" },
  { column: "location", label: "Location" },
  { column: "mode", label: "Work mode" },
  { column: "type", label: "Employment type" },
  { column: "pay", label: "Pay" },
  { column: "next", label: "Next step" },
  { column: "age", label: "Time in stage" },
];

const STAGE_OPTIONS = STAGES.map((value) => ({ value, label: STAGE_LABELS[value] }));
const WORK_MODE_OPTIONS = WORK_MODES.map((value) => ({ value, label: WORK_MODE_LABELS[value] }));
const EMPLOYMENT_OPTIONS = EMPLOYMENT_TYPES.map((value) => ({ value, label: EMPLOYMENT_TYPE_LABELS[value] }));

export function TableView() {
  const { applications: active, archivedApplications } = useApplicationsContext();
  const openApplication = useOpenApplication();
  const { archive, restore, error: archiveError, dismissError } = useArchiveActions();
  const [params, setParams] = useSearchParams();
  const query = parseTableQuery(params);
  const today = localToday();
  const applications = query.archived ? archivedApplications : active;

  // The address holds the search, filters, and sort. Changes replace the entry, so Back leaves the table (spec 012, AC-2, AC-13).
  const update = (changes: Partial<TableQuery>) => {
    setParams(toSearchParams({ ...query, ...changes }), { replace: true });
  };

  // The box keeps its own text so typing never waits on the address. It follows the address when something else changes it, such as Clear.
  const [text, setText] = useState(query.search);
  const lastTyped = useRef(query.search);
  useEffect(() => {
    if (query.search !== lastTyped.current) {
      lastTyped.current = query.search;
      setText(query.search);
    }
  }, [query.search]);

  if (applications.length === 0) {
    return query.archived ? (
      <p className="board-empty">Nothing is archived.</p>
    ) : (
      <p className="board-empty">No applications yet. Use the Add Application button in the sidebar to add your first one.</p>
    );
  }

  const rows = sortApplications(filterApplications(applications, query), query.sort);
  const filtered =
    query.search !== "" || query.stages.length > 0 || query.workModes.length > 0 || query.employmentTypes.length > 0;
  const clear = () => {
    update({ search: "", stages: [], workModes: [], employmentTypes: [] });
  };

  return (
    <>
      {archiveError && (
        <div className="board-error" role="alert">
          <span>{archiveError}</span>
          <button type="button" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}
      <div className="table-toolbar" role="group" aria-label="Search and filters">
        <input
          type="search"
          aria-label="Search company or job title"
          placeholder="Search company or job title"
          value={text}
          onChange={(event) => {
            lastTyped.current = event.target.value;
            setText(event.target.value);
            update({ search: event.target.value });
          }}
        />
        <FilterDropdown
          label="Stage"
          options={STAGE_OPTIONS}
          selected={query.stages}
          onChange={(stages) => {
            update({ stages });
          }}
        />
        <FilterDropdown
          label="Work mode"
          options={WORK_MODE_OPTIONS}
          selected={query.workModes}
          onChange={(workModes) => {
            update({ workModes });
          }}
        />
        <FilterDropdown
          label="Employment type"
          options={EMPLOYMENT_OPTIONS}
          selected={query.employmentTypes}
          onChange={(employmentTypes) => {
            update({ employmentTypes });
          }}
        />
        {filtered && (
          <>
            <span className="table-count" role="status">
              {rows.length} of {applications.length}
            </span>
            <button type="button" onClick={clear}>
              Clear
            </button>
          </>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="board-empty">No applications match.</p>
      ) : (
        <div className="table-wrap">
          <table className="applications-table">
            <thead>
              <tr>
                {COLUMNS.map(({ column, label }) => {
                  const direction = query.sort?.column === column ? query.sort.direction : null;
                  return (
                    <th key={column} scope="col" aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}>
                      <button type="button" className="sort-button" onClick={() => {
                        // Ascending, then descending, then back to the default order (AC-11).
                        update({ sort: direction === null ? { column, direction: "asc" } : direction === "asc" ? { column, direction: "desc" } : null });
                      }}>
                        {label}
                        {direction && <span aria-hidden="true"> {direction === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  );
                })}
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((application) => (
                <Row
                  key={application.id}
                  application={application}
                  today={today}
                  onOpen={openApplication}
                  onArchive={query.archived ? restore : archive}
                  restore={query.archived}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
