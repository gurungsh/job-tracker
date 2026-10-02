import { type Application, type Company, STAGES, STAGE_LABELS, type Stage, WORK_MODE_LABELS, isValidJobLink } from "@job-tracker/shared";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ApiError, api } from "../lib/api.ts";
import { applicationToInput } from "../lib/applicationInput.ts";
import { daysInStage, formatDate, isOverdue, localToday, shortTimeInStage } from "../lib/dates.ts";
import { employmentLabel } from "../lib/jobSummary.ts";
import { compactSalary } from "../lib/salary.ts";
import { STAGE_ICONS } from "../lib/stageIcons.ts";
import { readOrigin } from "../lib/viewOrigin.ts";
import { ApplicationDialog } from "./ApplicationDialog.tsx";
import { CompanyAvatar } from "./CompanyAvatar.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { Contacts } from "./Contacts.tsx";
import { Requirements } from "./Requirements.tsx";
import { Timeline } from "./Timeline.tsx";
import "./ApplicationDetailPage.css";

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; application: Application };

/** One application on its own page, at /applications/:id (spec 013). */
export function ApplicationDetailPage() {
  const { id } = useParams();
  // Keyed by the number, so going to another application starts from a clean state.
  return /^\d+$/.test(id ?? "") ? <Detail key={id} id={Number(id)} /> : <Missing />;
}

function Missing() {
  return (
    <div className="detail-page">
      <p role="alert">This application doesn't exist.</p>
      <Link to="/" className="detail-back">
        Back to board
      </Link>
    </div>
  );
}

function Detail({ id }: { id: number }) {
  const origin = readOrigin(useLocation().state);
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Bumped to load again after a failure.
  const [attempt, setAttempt] = useState(0);
  // Bumped to load the timeline again in place, when something outside it changes what it shows (spec 013, AC-5, AC-12).
  const [timelineKey, setTimelineKey] = useState(0);
  const [stageError, setStageError] = useState<string | null>(null);
  // The edit dialog, once the company names for its suggestions are loaded (spec 013, AC-6).
  const [editing, setEditing] = useState<{ companies: Company[] } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // What was last loaded or saved, to show again when a stage change fails. `stageRequest` numbers the changes, so only the last one's result counts.
  const savedApplication = useRef<Application | null>(null);
  const stageRequest = useRef(0);

  useEffect(() => {
    let current = true;
    api.getApplication(id).then(
      (application) => {
        if (!current) return;
        savedApplication.current = application;
        setState({ status: "ready", application });
      },
      (error: unknown) => {
        if (!current) return;
        if (error instanceof ApiError && error.status === 404) setState({ status: "missing" });
        else setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [id, attempt]);

  /**
   * Saves a new stage (spec 013, AC-5). The menu shows it at once. The latest saved application is fetched first, so
   * nothing edited elsewhere is overwritten, and only the stage is changed. If it fails, the saved stage comes back.
   */
  async function changeStage(stage: Stage) {
    if (state.status !== "ready") return;
    const request = (stageRequest.current += 1);
    setStageError(null);
    setState({ status: "ready", application: { ...state.application, stage } });
    try {
      const latest = await api.getApplication(id);
      const saved = await api.updateApplication(id, applicationToInput(latest, { stage }));
      if (request !== stageRequest.current) return;
      savedApplication.current = saved;
      setState({ status: "ready", application: saved });
      setTimelineKey((count) => count + 1);
    } catch (error) {
      if (request !== stageRequest.current) return;
      if (error instanceof ApiError && error.status === 404) {
        setState({ status: "missing" });
        return;
      }
      setStageError(`Couldn't change the stage. ${error instanceof Error ? error.message : String(error)}`);
      if (savedApplication.current) setState({ status: "ready", application: savedApplication.current });
    }
  }

  async function openEdit() {
    // The suggestions are a convenience, so the form still opens without them.
    const companies = await api.listCompanies().catch((): Company[] => []);
    setEditing({ companies });
  }

  /** Deletes after the confirmation, then goes back to the view I came from (spec 013, AC-7, AC-8). */
  async function remove() {
    setConfirmingDelete(false);
    setDeleteError(null);
    setDeleting(true);
    try {
      await api.deleteApplication(id);
      void navigate(origin.path, { replace: true });
    } catch (error) {
      setDeleteError(`Couldn't delete. ${error instanceof Error ? error.message : String(error)}`);
      setDeleting(false);
    }
  }

  if (state.status === "loading") return <p className="detail-page detail-status">Loading…</p>;
  if (state.status === "missing") return <Missing />;
  if (state.status === "error") {
    return (
      <div className="detail-page">
        <Link to={origin.path} className="detail-back">
          {origin.label}
        </Link>
        <div className="detail-status" role="alert">
          <p>Couldn't load this application. {state.message}</p>
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { application } = state;
  const kind = [application.workMode ? WORK_MODE_LABELS[application.workMode] : null, employmentLabel(application)]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="detail-page">
      <Link to={origin.path} className="detail-back">
        {origin.label}
      </Link>
      <header className="detail-header">
        <div className="detail-heading">
          <span className="detail-company">
            <CompanyAvatar name={application.companyName} />
            {application.companyName}
          </span>
          <h2 className="detail-title">{application.jobTitle}</h2>
          {kind && <p className="detail-kind">{kind}</p>}
        </div>
        <div className="detail-actions">
          <select
            aria-label="Stage"
            value={application.stage}
            onChange={(event) => void changeStage(event.target.value as Stage)}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void openEdit()}>
            Edit
          </button>
          <button
            type="button"
            className="danger"
            disabled={deleting}
            onClick={() => {
              setConfirmingDelete(true);
            }}
          >
            Delete
          </button>
        </div>
      </header>
      {(stageError ?? deleteError) && (
        <p className="detail-error" role="alert">
          {stageError ?? deleteError}
        </p>
      )}

      <div className="detail-layout">
        <div className="detail-main">
          <Section title="Requirements">
            <Requirements applicationId={application.id} />
          </Section>
          <Section title="Timeline">
            <Timeline reloadKey={timelineKey} applicationId={application.id} companyId={application.companyId} />
          </Section>
          <Section title="Job description">
            {application.jobDescription ? (
              <p className="detail-description">{application.jobDescription}</p>
            ) : (
              <p className="detail-empty">No description saved.</p>
            )}
          </Section>
        </div>
        <div className="detail-side">
          <Section title="Details" className="detail-section--details">
            <Facts application={application} />
          </Section>
          <Section title="Contacts">
            <Contacts
              companyId={application.companyId}
              companyName={application.companyName}
              onChange={() => {
                setTimelineKey((count) => count + 1);
              }}
            />
          </Section>
        </div>
      </div>

      {editing && (
        <ApplicationDialog
          application={application}
          companies={editing.companies}
          onSaved={(saved) => {
            savedApplication.current = saved;
            setState({ status: "ready", application: saved });
            setTimelineKey((count) => count + 1);
            setEditing(null);
          }}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete application?"
          message={`Delete ${application.jobTitle} at ${application.companyName}? This also removes its requirements and timeline, and can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => void remove()}
          onCancel={() => {
            setConfirmingDelete(false);
          }}
        />
      )}
    </div>
  );
}

function Section({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className={className ? `detail-section ${className}` : "detail-section"} aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

/** The application's facts as labels and values. A value that was never entered shows "–" (spec 013, AC-3). */
function Facts({ application }: { application: Application }) {
  const StageIcon = STAGE_ICONS[application.stage];
  const pay = compactSalary(application.salaryMin, application.salaryMax, application.salaryPeriod);
  const { nextStep, nextStepDue, jobLink } = application;
  const overdue = nextStepDue !== null && isOverdue(nextStepDue, localToday());
  return (
    <dl className="detail-facts">
      <Fact label="Stage">
        <span className="detail-stage" data-stage={application.stage}>
          <StageIcon size={16} aria-hidden="true" /> {STAGE_LABELS[application.stage]}
        </span>
      </Fact>
      <Fact label="Time in stage">{shortTimeInStage(daysInStage(application.stageChangedAt))}</Fact>
      <Fact label="Pay">{pay || null}</Fact>
      <Fact label="Location">{application.location}</Fact>
      <Fact label="Source">{application.source}</Fact>
      <Fact label="Job link">
        {jobLink &&
          (isValidJobLink(jobLink) ? (
            <a href={jobLink} target="_blank" rel="noopener noreferrer">
              Open posting <span aria-hidden="true">↗</span>
            </a>
          ) : (
            jobLink
          ))}
      </Fact>
      <Fact label="Next step">
        {(nextStep || nextStepDue) && (
          <>
            {nextStep}
            {nextStepDue && (
              <span className="detail-due">
                {overdue && <strong className="detail-overdue">Overdue</strong>} {formatDate(nextStepDue)}
              </span>
            )}
          </>
        )}
      </Fact>
      <Fact label="Applied">{application.appliedOn && formatDate(application.appliedOn)}</Fact>
      {application.closedOn && <Fact label="Closed">{formatDate(application.closedOn)}</Fact>}
    </dl>
  );
}

function Fact({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="detail-fact">
      <dt>{label}</dt>
      <dd>{children || "–"}</dd>
    </div>
  );
}
