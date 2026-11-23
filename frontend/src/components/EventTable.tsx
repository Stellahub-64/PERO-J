import { useState } from "react";
import { Link } from "react-router-dom";
import type { DecodedEvent } from "../api";

interface Props {
  events: DecodedEvent[];
}

export default function EventTable({ events }: Props) {
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);
  if (!events.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 16 }}
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
        <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>
          No events found.
        </p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          Register your contract to start decoding events
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
            <th style={th}>Seq</th>
            <th style={th}>Ledger</th>
            <th style={th}>Function</th>
            <th style={th}>Description</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => {
            const isExpanded = expandedSeq === ev.seq;
            const isLongDescription = ev.description.length > 60;
            return (
              <>
                <tr key={`row-${ev.seq}`} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={td}>
                    {ev.status === "pending"
                      ? <span style={{ color: "var(--muted)" }}>Pending</span>
                      : <Link to={`/event/${ev.seq}`}>#{ev.seq}</Link>}
                  </td>
                  <td style={td}>
                    {ev.status === "pending"
                      ? <span className="pending-state"><span className="pending-spinner" />Confirming</span>
                      : ev.ledger.toLocaleString()}
                  </td>
                  <td style={td}>
                    <span className="badge">{ev.function}</span>
                  </td>
                  <td 
                    style={{ 
                      ...td, 
                      maxWidth: isExpanded ? undefined : 480, 
                      overflow: isExpanded ? "visible" : "hidden",
                      textOverflow: isExpanded ? "clip" : "ellipsis",
                      whiteSpace: isExpanded ? "normal" : "nowrap",
                      wordBreak: isExpanded ? "break-word" : "normal",
                      cursor: isLongDescription ? "pointer" : "default",
                    }}
                    title={ev.description}
                    onClick={() => isLongDescription && setExpandedSeq(isExpanded ? null : ev.seq)}
                  >
                    {ev.description}
                    {isLongDescription && !isExpanded && (
                      <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>…</span>
                    )}
                  </td>
                </tr>
                {isExpanded && isLongDescription && (
                  <tr key={`expand-${ev.seq}`} style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)" }}>
                    <td colSpan={4} style={{ ...td, padding: 16 }}>
                      <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>Full description:</div>
                      <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                        {ev.description}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "10px 12px" };
