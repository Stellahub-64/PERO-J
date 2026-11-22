import { useState } from "react";
import type {
  BetInput,
  BetMarket,
  BetPhase,
  OddsPreviewState,
} from "../betting/types";
import OddsPreview from "./OddsPreview";

interface BetSlipProps {
  address: string;
  markets: BetMarket[];
  phase: BetPhase;
  oddsPreview: OddsPreviewState;
  submissionDisabled: boolean;
  onConnect: () => void;
  onPlaceBet: (input: BetInput) => void;
}

const phaseLabels: Record<BetPhase, string> = {
  idle: "Sign & place bet",
  signing: "Awaiting wallet signature…",
  submitting: "Submitting bet…",
  confirming: "Confirming on-chain…",
};

export default function BetSlip({
  address,
  markets,
  phase,
  oddsPreview,
  submissionDisabled,
  onConnect,
  onPlaceBet,
}: BetSlipProps) {
  const [marketId, setMarketId] = useState(markets[0]?.id ?? "");
  const [selection, setSelection] = useState(markets[0]?.outcomes[0]?.id ?? "");
  const [amount, setAmount] = useState("1");

  const market = markets.find((item) => item.id === marketId) ?? markets[0];
  const outcome =
    market?.outcomes.find((item) => item.id === selection) ??
    market?.outcomes[0];
  const parsedAmount = Number(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const busy = phase !== "idle";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!market || !outcome || !hasValidAmount || submissionDisabled || busy) return;
    onPlaceBet({
      marketId: market.id,
      selection: outcome.id,
      amount: parsedAmount,
      odds: outcome.odds,
    });
  }

  if (!market) {
    return <p style={{ color: "var(--muted)" }}>No betting markets available.</p>;
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Market</span>
        <select
          value={market.id}
          onChange={(event) => {
            const next = markets.find((item) => item.id === event.target.value);
            setMarketId(event.target.value);
            setSelection(next?.outcomes[0]?.id ?? "");
          }}
          disabled={busy}
        >
          {markets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>

      <fieldset style={{ border: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
          Selection
        </legend>
        {market.outcomes.map((item) => (
          <label
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              border: `1px solid ${item.id === outcome?.id ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="selection"
              value={item.id}
              checked={item.id === outcome?.id}
              onChange={() => setSelection(item.id)}
              disabled={busy}
            />
            <span style={{ flex: 1 }}>{item.label}</span>
            <code>{item.odds.toFixed(2)}</code>
          </label>
        ))}
      </fieldset>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Stake (XLM)</span>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={busy}
        />
      </label>

      <OddsPreview state={oddsPreview} selectedOdds={outcome?.odds} />

      {hasValidAmount && outcome && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Potential return: {(parsedAmount * outcome.odds).toFixed(2)} XLM
        </div>
      )}

      {!address ? (
        <button type="button" onClick={onConnect}>
          Connect Freighter wallet
        </button>
      ) : (
        <button type="submit" disabled={busy || submissionDisabled || !hasValidAmount}>
          {phaseLabels[phase]}
        </button>
      )}
    </form>
  );
}
