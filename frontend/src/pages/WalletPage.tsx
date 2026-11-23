import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StrKey } from "@stellar/stellar-sdk";
import { api } from "../api";
import EventTable from "../components/EventTable";
import Skeleton from "../components/Skeleton";
import Toast from "../components/Toast";
import { usePendingBets } from "../optimisticBets";

export default function WalletPage() {
  const { address = "" } = useParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(address);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const pendingEvents = usePendingBets(address);

  useEffect(() => {
    const handleFailure = (event: Event) => {
      const message = (event as CustomEvent<{ message: string }>).detail?.message;
      setToast(message || "Bet transaction failed on-chain.");
    };
    window.addEventListener("bet:failed", handleFailure);
    return () => window.removeEventListener("bet:failed", handleFailure);
  }, []);

  const isValidAddress = StrKey.isValidEd25519PublicKey(address);

  const { data, isLoading } = useQuery({
    queryKey: ["wallet", address, page],
    queryFn: () => api.wallet(address, page),
    enabled: !!address && isValidAddress,
  });

  const events = [...pendingEvents, ...(data?.events ?? [])];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 25;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/wallet/${searchInput.trim()}`);
      setPage(1);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Wallet History</h2>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Enter Stellar address"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 12 }}
          />
          <button type="submit">Search</button>
        </form>
        {address && <code style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>{address}</code>}
      </div>

      <div className="card">
        {!address
          ? <p style={{ color: "var(--muted)" }}>Enter a Stellar address to view wallet history.</p>
          : !isValidAddress
          ? <p style={{ color: "var(--muted)" }}>Invalid Stellar address.</p>
          : isLoading
          ? <Skeleton />
          : <EventTable events={events} />}
      </div>

      {/* Pagination */}
      {isValidAddress && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: "6px 10px", color: "var(--muted)" }}>Page {page}</span>
          <button disabled={page * limit >= total || events.length < limit} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
