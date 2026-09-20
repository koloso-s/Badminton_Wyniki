import React from "react";
import "./App.css";
import Results from "./components/Results";

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1 className="app-title">
          Turniej Badmintona Gwoźnica Górna 2026/2027
        </h1>
      </header>

      <main className="app-main">
        <Results />
      </main>

      <footer className="home-page-footer">
        <p>
          Gwoźnica Górna 2026/2027 Turniej Badmintona Zarych Krystian
        </p>
      </footer>
    </div>
  );
}

export default App;