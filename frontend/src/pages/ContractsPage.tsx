import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import Skeleton from "../components/Skeleton";

function truncateId(id: string, head = 8, tail = 6) {
  if (!id) return "";
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export default function ContractsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const { data, isLoading } = useQuery({
    queryKey: ["contracts", debounced, page],
    queryFn: () => api.contracts({ q: debounced || undefined, page }),
    placeholderData: (prev) => prev,
  });
  const contracts = data?.contracts ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 25;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Contracts</h1>
        <p style={{ color: "var(--muted)" }}>
          Registered Soroban contracts with registered ABI metadata.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search contracts by name or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </form>

      <div className="card">
        {isLoading ? (
          <Skeleton rows={3} />
        ) : contracts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>
              {debounced ? "No contracts match your search." : "No contracts registered yet."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {contracts.map((c) => (
              <Link
                key={c.id}
                to={`/contract/${c.id}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                      {c.eventCount ?? 0} events
                    </span>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    {c.description || "No description"}
                  </span>
                  <code
                    title={c.id}
                    style={{ fontSize: 11, color: "var(--muted)", wordBreak: "break-all" }}
                  >
                    {truncateId(c.id)}
                  </code>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {total > limit && (
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ padding: "6px 10px", color: "var(--muted)" }}>Page {page}</span>
          <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
