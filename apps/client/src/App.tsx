import { Board } from "./Board.tsx";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Job Tracker</h1>
      </header>
      <main>
        <Board />
      </main>
    </div>
  );
}
