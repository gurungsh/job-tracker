import { Navigate, Route, Routes } from "react-router";
import { ApplicationDetailPage } from "./components/ApplicationDetailPage.tsx";
import { ApplicationsPage } from "./components/ApplicationsPage.tsx";
import { AppShell } from "./components/AppShell.tsx";
import { Board } from "./components/Board.tsx";
import { TableView } from "./components/TableView.tsx";
import { UserGuidePage } from "./components/UserGuidePage.tsx";
import { ApplicationsProvider } from "./lib/useApplications.tsx";

export function App() {
  return (
    <ApplicationsProvider>
      <AppShell>
        <Routes>
          <Route element={<ApplicationsPage />}>
            <Route index element={<Board />} />
            <Route path="table" element={<TableView />} />
          </Route>
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="guide" element={<UserGuidePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </ApplicationsProvider>
  );
}
