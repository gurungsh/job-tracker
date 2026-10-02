import { Board } from "./components/Board.tsx";
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
        <Board />
      </main>
    </div>
  );
}
