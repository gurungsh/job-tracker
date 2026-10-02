import { type KeyboardEvent, useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hasAttribute("disabled") && element.closest("[hidden]") === null,
  );
}

/**
 * Keeps keyboard focus in a dialog (spec 013, AC-16). Focus moves in when the dialog opens, unless something inside
 * already has it. Tab and Shift+Tab wrap at the ends, and focus goes back to what opened the dialog when it closes.
 * Spread `props` on the dialog's element.
 */
export function useDialogFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!container.contains(document.activeElement)) (focusableIn(container)[0] ?? container).focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<T>) {
    if (event.key !== "Tab" || !ref.current) return;
    const items = focusableIn(ref.current);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    // Only the dialog the focus is in handles the key, so a dialog on top of another keeps its own focus.
    event.stopPropagation();
    if (event.shiftKey && (active === first || active === ref.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { ref, tabIndex: -1, onKeyDown };
}
