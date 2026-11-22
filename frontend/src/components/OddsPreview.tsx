import type { OddsPreviewState } from "../betting/types";

interface OddsPreviewProps {
  state: OddsPreviewState;
  selectedOdds?: number;
}

export default function OddsPreview({ state, selectedOdds }: OddsPreviewProps) {
  const odds = state.odds ?? selectedOdds;
  const label =
    state.status === "pending"
      ? "Updating odds…"
      : state.status === "confirmed"
      ? "Odds locked"
      : state.status === "failed"
      ? "Odds update failed"
      : "Live odds";

  return (
    <div className={`odds-preview odds-${state.status}`}>
      <span className="odds-label">{label}</span>
      <span className="odds-value">{odds ? odds.toFixed(2) : "—"}</span>
      {state.status === "pending" && (
        <span className="spinner" role="status" aria-label="Updating odds" />
      )}
    </div>
  );
}
