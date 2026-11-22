import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import Home from "./pages/Home";
import BetsPage from "./pages/BetsPage";
import ContractPage from "./pages/ContractPage";
import WalletPage from "./pages/WalletPage";
import EventPage from "./pages/EventPage";
import NotFound from "./pages/NotFound";
import { useState } from 'react';
import './App.css';
import EventTable from './components/EventTable';

function App() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <ToastProvider>
      <Nav />
      <ErrorBoundary>
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bets" element={<BetsPage />} />
            <Route path="/contract/:id" element={<ContractPage />} />
            <Route path="/wallet/:address" element={<WalletPage />} />
            <Route path="/event/:seq" element={<EventPage />} />
          </Routes>
        </main>
      </ErrorBoundary>
    </ToastProvider>
    <div className="app">
      <header className="app-header">
        <div className="app-brand">Soroban Smart Block Explorer</div>
        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>
        <nav className={`app-nav${navOpen ? ' app-nav--open' : ''}`}>
          <a href="#events">Events</a>
          <a href="#contracts">Contracts</a>
          <a href="#ledgers">Ledgers</a>
        </nav>
      </header>
      <main className="app-main">
        <EventTable />
      </main>
    </div>
  );
}

export default App;
