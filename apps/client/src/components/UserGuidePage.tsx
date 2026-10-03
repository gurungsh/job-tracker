import { STAGES, STAGE_LABELS } from "@job-tracker/shared";
import { type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { readGuideOrigin } from "../lib/viewOrigin.ts";
import "./UserGuidePage.css";

type GuideSection = { id: string; title: string; body: ReactNode };

const STAGE_NAMES = STAGES.map((stage) => STAGE_LABELS[stage]).join(", ");

/** One section per screen. The contents list is built from this list, so an entry can't point to a missing section (spec 020, AC-3). */
const SECTIONS: GuideSection[] = [
  {
    id: "board",
    title: "The board",
    body: (
      <>
        <p>The board is the main screen. It has one column per stage, and each application is a card in its stage's column.</p>
        <ul>
          <li>Click a card to open that application's page.</li>
          <li>Drag a card to another column to change its stage. A copy of the card follows the pointer, and a dashed placeholder shows where it will land.</li>
          <li>Open a card's Actions menu and choose Move to to change the stage without dragging.</li>
          <li>Use the stage filter in the toolbar to choose which columns show. The closed stages (Accepted, Rejected, and Withdrawn) are hidden to start. The choice is kept in this browser.</li>
          <li>Use the switch at the top to go between the board and the table.</li>
        </ul>
      </>
    ),
  },
  {
    id: "table",
    title: "The table",
    body: (
      <>
        <p>The table lists every application in one place.</p>
        <ul>
          <li>Search by company or job title.</li>
          <li>Filter by stage, work mode, and employment type.</li>
          <li>Click a column heading to sort by it, and click again to reverse the order.</li>
          <li>Your search, filters, and sort are kept in the page address, so you can reload or bookmark a filtered view.</li>
          <li>Click a row to open that application's page.</li>
        </ul>
      </>
    ),
  },
  {
    id: "sidebar",
    title: "The sidebar",
    body: (
      <>
        <p>The sidebar is on every screen. On a narrow screen it folds behind the menu button in the header.</p>
        <ul>
          <li>Add application opens the form to add one, whichever screen you are on. It always starts on Wishlist.</li>
          <li>All applications opens the table with no filters.</li>
          <li>Each stage shows how many applications it holds and opens the table filtered to that stage. The stages, in order, are {STAGE_NAMES}. The last three close an application.</li>
          <li>Archived opens the applications you have archived.</li>
        </ul>
      </>
    ),
  },
  {
    id: "adding",
    title: "Adding and editing an application",
    body: (
      <>
        <p>Adding and editing use the same form, in a dialog.</p>
        <ul>
          <li>Company and job title are required. Pick an existing company or type a new name, and add its website if you like, so the company name links to it.</li>
          <li>Choose a stage, a next step, and a due date for it.</li>
          <li>Under job details, record the job link, location, work mode, employment type, salary range, source, and description.</li>
          <li>Saving keeps you where you were, and the screen and counts update.</li>
        </ul>
      </>
    ),
  },
  {
    id: "application",
    title: "An application's page",
    body: (
      <>
        <p>An application's page shows everything about it in sections.</p>
        <ul>
          <li>Details show the job's facts and its description.</li>
          <li>Requirements list the items from the posting, marked required or preferred. Check off the ones you meet.</li>
          <li>The timeline records notes, emails, calls, and interviews, each with a date and time. A stage change adds an entry by itself.</li>
          <li>Contacts are the people at the company. They belong to the company, so every application there shows them.</li>
          <li>Use the stage menu at the top to change the stage, and Edit or Delete to change or remove the application. Every ✕ asks before it deletes.</li>
        </ul>
      </>
    ),
  },
  {
    id: "archiving",
    title: "Archiving",
    body: (
      <>
        <p>Archive an application to hide it without deleting it.</p>
        <ul>
          <li>Choose Archive on a card, or on the application's page. It leaves the board, the table, and the counts.</li>
          <li>Find it under Archived in the sidebar. An archived application can be read, restored, or deleted, and nothing else until it is restored.</li>
          <li>Choose Restore, on its page or in the Archived list, to bring it back in the stage it had.</li>
        </ul>
      </>
    ),
  },
  {
    id: "themes",
    title: "Light and dark themes",
    body: (
      <p>
        The sun and moon switch in the header changes between the light and the dark theme. The app starts with your device's setting, and the switch overrides it.
      </p>
    ),
  },
];

/** The built-in guide: a contents list and one section per screen, with a way back to where I came from (spec 020). */
export function UserGuidePage() {
  const origin = readGuideOrigin(useLocation().state);

  function goTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="guide-page">
      <Link to={origin.path} className="guide-back">
        {origin.label}
      </Link>
      <h2>User Guide</h2>
      <nav aria-label="Contents" className="guide-contents">
        <ol>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={(event) => {
                  goTo(event, section.id);
                }}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="guide-section">
          <h3 id={`${section.id}-title`}>{section.title}</h3>
          {section.body}
        </section>
      ))}
    </div>
  );
}
