import { useMemo, useState } from "react";
import { markets, bettingConfig } from "../betting/config";
import { StellarBetGateway } from "../betting/gateway";
import { useBets, useOptimisticBets } from "../betting/useOptimisticBets";
import { useToast } from "../components/Toast";
import BetHistory from "../components/BetHistory";
import BetSlip from "../components/BetSlip";

export default function BetsPage() {
  const toast = useToast();
  const gateway = useMemo(() => new StellarBetGateway(), []);
  const [address, setAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: bets = [], isLoading } = useBets(address);
  const { placeBet, phase, oddsPreview } = useOptimisticBets({ address, gateway });

  async function connect() {
    setIsConnecting(true);
    try {
      const connectedAddress = await gateway.connect();
      setAddress(connectedAddress);
      toast.success("Wallet connected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Betting</h2>
        <p style={{ color: "var(--muted)" }}>
          Bets appear in your history as soon as your wallet signs the transaction.
          Pending bets are reconciled with the indexer after on-chain confirmation.
        </p>
        {address && (
          <code style={{ display: "block", marginTop: 12, fontSize: 12, wordBreak: "break-all" }}>
            {address}
          </code>
        )}
        {!bettingConfig.contractId && (
          <p style={{ color: "var(--yellow)", marginTop: 12 }}>
            Set VITE_BET_CONTRACT_ID to enable bet submissions.
          </p>
        )}
      </div>

      <div className="bet-grid">
        <section className="card">
          <h3 style={{ marginBottom: 16 }}>Place a bet</h3>
          <BetSlip
            address={address}
            markets={markets}
            phase={phase}
            oddsPreview={oddsPreview}
            submissionDisabled={!bettingConfig.contractId}
            onConnect={connect}
            onPlaceBet={(input) => void placeBet(input)}
          />
          {isConnecting && <p style={{ marginTop: 10, color: "var(--muted)" }}>Connecting…</p>}
        </section>

        <section>
          <h3 style={{ marginBottom: 12 }}>Your betting history</h3>
          <BetHistory bets={bets} markets={markets} isLoading={isLoading && !!address} />
        </section>
      </div>
    </div>
  );
}
