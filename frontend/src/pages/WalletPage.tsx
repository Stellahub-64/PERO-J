import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StrKey } from "@stellar/stellar-sdk";
import { api } from "../api";
import EventTable from "../components/EventTable";
import Skeleton from "../components/Skeleton";

export default function WalletPage() {
  const { address = "" } = useParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(address);
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = address
      ? `Wallet ${address} - Soroban Smart Block Explorer`
      : "Wallet History - Soroban Smart Block Explorer";
  }, [address]);

  const isValidAddress = StrKey.isValidEd25519PublicKey(address);

  const { data, isLoading } = useQuery({
    queryKey: ["wallet", address, page],
    queryFn: () => api.wallet(address, page),
    enabled: !!address && isValidAddress,
  });

  const events = data?.events ?? [];
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
          : <EventTable
            events={events}
            emptyMessage="No events found for this address."
            emptySubtitle="This address has no indexed events."
          />}
      </div>

      {/* Pagination */}
      {isValidAddress && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: "6px 10px", color: "var(--muted)" }}>Page {page}</span>
          {/* Disable Next only when all events have been fetched.
              Checking page * limit >= total (not events.length < limit)
              avoids prematurely disabling the button when the last page
              is exactly full (total % limit === 0). */}
          <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
