import Skeleton from "./Skeleton";
import CopyButton from "./CopyButton";
import type { Bet, BetMarket } from "../betting/types";

interface BetHistoryProps {
  bets: Bet[];
  markets: BetMarket[];
  isLoading: boolean;
}

function shortHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export default function BetHistory({ bets, markets, isLoading }: BetHistoryProps) {
  if (isLoading) return <div className="card"><Skeleton rows={3} /></div>;

  if (bets.length === 0) {
    return (
      <div className="card">
        <p style={{ color: "var(--muted)" }}>No bets placed yet.</p>
      </div>
    );
  }

  return (
    <div className="card bet-history">
      {bets.map((bet) => {
        const market = markets.find((item) => item.id === bet.marketId);
        const outcome = market?.outcomes.find((item) => item.id === bet.selection);

        return (
          <div className="bet-history-row" key={bet.id}>
            <div>
              <strong>{market?.title ?? bet.marketId}</strong>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {outcome?.label ?? bet.selection} · {bet.amount.toFixed(2)} XLM @ {bet.odds.toFixed(2)}
              </div>
            </div>
            <div>
              <span className={`badge ${bet.status === "confirmed" ? "green" : "yellow"}`}>
                {bet.status === "pending" && (
                  <span className="spinner spinner-small" aria-hidden="true" />
                )}
                {bet.status === "pending" ? " Pending" : ` Ledger ${bet.ledger ?? "—"}`}
              </span>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                {new Date(bet.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="bet-history-hash">
              <code title={bet.txHash}>{shortHash(bet.txHash)}</code>
              <CopyButton value={bet.txHash} size="small" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
