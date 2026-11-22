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

export default function App() {
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
  );
}
