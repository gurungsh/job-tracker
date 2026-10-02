import { MemoryRouter } from "react-router";
import { App } from "../../src/App.tsx";

/** The whole app in a router that starts at `path`. */
export function AppAt({ path = "/" }: { path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}
