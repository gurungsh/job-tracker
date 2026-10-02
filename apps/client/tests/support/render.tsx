import { type InitialEntry, MemoryRouter } from "react-router";
import { App } from "../../src/App.tsx";

/** The whole app in a router that starts at `path`, or at `entry` when it needs router state (spec 013). */
export function AppAt({ path = "/", entry }: { path?: string; entry?: InitialEntry }) {
  return (
    <MemoryRouter initialEntries={[entry ?? path]}>
      <App />
    </MemoryRouter>
  );
}
