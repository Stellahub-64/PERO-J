import type { BetStatus } from "../hooks/useOptimisticBet";

export function OptimisticBetStatus({ status }: { status: BetStatus }) {
  if (status === "confirmed") {
    return <span className="badge green">Confirmed</span>;
  }
  if (status === "failed") {
    return <span className="badge red">Failed</span>;
  }
  return (
    <span className="badge yellow">
      <span className="pending-spinner" aria-hidden="true" />
      Pending
    </span>
  );
}
