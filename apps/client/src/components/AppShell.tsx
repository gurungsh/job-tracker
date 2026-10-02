import { Menu, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { NARROW_QUERY, useMediaQuery } from "../lib/useMediaQuery.ts";
import { useDialogFocus } from "../lib/useDialogFocus.ts";
import { useApplicationsStore } from "../lib/useApplications.tsx";
import { ApplicationDialog } from "./ApplicationDialog.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import "./AppShell.css";

const DRAWER_ID = "app-drawer";

/** The frame around every screen: the header, the sidebar column, and the page beside it (spec 014, AC-1, AC-6, AC-8, AC-12). */
export function AppShell({ children }: { children: ReactNode }) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const [menuOpen, setMenuOpen] = useState(false);
  // Going from narrow to wide closes the menu, so coming back to narrow starts closed (spec 014, edge cases).
  const [wasNarrow, setWasNarrow] = useState(narrow);
  if (narrow !== wasNarrow) {
    setWasNarrow(narrow);
    if (!narrow) setMenuOpen(false);
  }
  const open = narrow && menuOpen;

  // The dialog for adding an application, from any screen (spec 015, AC-3). It lives here, not in the sidebar, because
  // the drawer leaves the page when a choice is made and the dialog has to stay.
  const { state, reload, addApplication } = useApplicationsStore();
  const [adding, setAdding] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const focusAfterAdd = useRef(false);
  const openAdd = useCallback(() => {
    setAdding(true);
  }, []);
  const closeAdd = useCallback(() => {
    focusAfterAdd.current = true;
    setAdding(false);
  }, []);

  const menuButton = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  // Where focus goes once the drawer is gone: the menu button, or the page an entry opened (AC-9). It is set when the
  // drawer is closed and used after it has left the page, so it comes after the drawer gives focus back to its opener.
  const focusAfterClose = useRef<"button" | "page" | null>(null);
  const closeMenu = useCallback((focus: "button" | "page") => {
    focusAfterClose.current = focus;
    setMenuOpen(false);
  }, []);
  useEffect(() => {
    if (open || !focusAfterClose.current) return;
    (focusAfterClose.current === "button" ? menuButton : main).current?.focus();
    focusAfterClose.current = null;
  }, [open]);

  // Focus goes to the Add button, or to the menu button on a narrow screen, where the button is in a drawer that has
  // gone. It is set once the dialog has left the page, so it comes after the dialog gives focus back (AC-5).
  useEffect(() => {
    if (adding || !focusAfterAdd.current) return;
    (narrow ? menuButton : addButton).current?.focus();
    focusAfterAdd.current = false;
  }, [adding, narrow]);

  return (
    <div className={narrow ? "app app--narrow" : "app"}>
      <header className="app-header">
        <div className="app-header-start">
          {narrow && (
            <button
              ref={menuButton}
              type="button"
              className="menu-button"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls={DRAWER_ID}
              onClick={() => {
                if (open) closeMenu("button");
                else setMenuOpen(true);
              }}
            >
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          )}
          <h1>
            <Link to="/">Job Tracker</Link>
          </h1>
        </div>
        <ThemeToggle />
      </header>
      <div className="app-body">
        {!narrow && (
          <div className="app-sidebar">
            <Sidebar onAdd={openAdd} addRef={addButton} />
          </div>
        )}
        {/* Focusable, so choosing a sidebar entry can send focus to the page it opened (AC-9). */}
        <main ref={main} tabIndex={-1}>
          {children}
        </main>
      </div>
      {open && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => {
              closeMenu("button");
            }}
          />
          <Drawer
            onClose={() => {
              closeMenu("button");
            }}
            onChoose={() => {
              closeMenu("page");
            }}
            onAdd={() => {
              // The drawer goes and the dialog opens in one step. It isn't closed the usual way, because that sends
              // focus to the menu button, which the dialog is about to take. Focus goes there when the dialog closes (AC-6).
              setMenuOpen(false);
              openAdd();
            }}
          />
        </>
      )}
      {adding && (
        <ApplicationDialog
          companies={state.status === "ready" ? state.companies : []}
          onSaved={(saved) => {
            // A list that isn't loaded can't take the new one, so it is loaded again, with it included (AC-9).
            if (state.status === "ready") addApplication(saved);
            else reload();
            closeAdd();
          }}
          onClose={closeAdd}
        />
      )}
    </div>
  );
}

/** The sidebar on a narrow screen: over the page, with focus kept inside, closing on Escape (spec 014, AC-9, AC-10). */
function Drawer({ onClose, onChoose, onAdd }: { onClose: () => void; onChoose: () => void; onAdd: () => void }) {
  const focus = useDialogFocus<HTMLDivElement>();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div id={DRAWER_ID} className="app-drawer" {...focus} role="dialog" aria-modal="true" aria-label="Menu">
      <Sidebar onNavigate={onChoose} onAdd={onAdd} />
    </div>
  );
}
