// Stands in for the browser's light/dark device setting in tests. jsdom has no matchMedia.
import { vi } from "vitest";

export function stubDevice(dark: boolean): { setDark: (value: boolean) => void } {
  let isDark = dark;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      get matches() {
        return query.includes("dark") && isDark;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  return {
    setDark: (value) => {
      isDark = value;
      for (const listener of [...listeners]) listener();
    },
  };
}
