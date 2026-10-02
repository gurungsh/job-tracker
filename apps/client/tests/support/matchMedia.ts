import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Stands in for `window.matchMedia` in tests, where jsdom has none. Every query matches `narrow`, and `setNarrow`
 * changes the answer and tells the listeners, as resizing the window would.
 */
export function stubMatchMedia(narrow: boolean) {
  let matches = narrow;
  const listeners = new Set<() => void>();
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  return {
    matchMedia,
    setNarrow(value: boolean) {
      matches = value;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
  };
}
