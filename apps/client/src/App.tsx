import { Navigate, Route, Routes } from "react-router";
import { ApplicationsPage } from "./components/ApplicationsPage.tsx";
import { Board } from "./components/Board.tsx";
import { TableView } from "./components/TableView.tsx";
import { ThemeToggle } from "./components/ThemeToggle.tsx";
import "./App.css";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Job Tracker</h1>
        <ThemeToggle />
      </header>
      <main>
        <Routes>
          <Route element={<ApplicationsPage />}>
            <Route index element={<Board />} />
            <Route path="table" element={<TableView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
