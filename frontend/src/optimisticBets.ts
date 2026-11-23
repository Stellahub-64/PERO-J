import { useSyncExternalStore } from "react";
import type { DecodedEvent } from "./api";

export interface PendingBet {
  optimisticId: string;
  txHash?: string;
  address: string;
  event: DecodedEvent;
}

type Listener = () => void;

const pendingBets = new Map<string, PendingBet>();
const listeners = new Set<Listener>();
const addressSnapshots = new Map<string, DecodedEvent[]>();

function emit() {
  addressSnapshots.clear();
  listeners.forEach(listener => listener());
}

export function addPendingBet(pending: Omit<PendingBet, "optimisticId" | "event"> & {
  optimisticId?: string;
  event?: Partial<DecodedEvent>;
}): string {
  const optimisticId = pending.optimisticId ?? `pending-${crypto.randomUUID()}`;

  if (Array.from(pendingBets.values()).some(bet =>
    bet.address === pending.address &&
    bet.txHash &&
    pending.txHash &&
    bet.txHash === pending.txHash
  )) {
    return optimisticId;
  }

  const event: DecodedEvent = {
    seq: -Date.now(),
    contract_id: pending.event?.contract_id ?? "",
    function: pending.event?.function ?? "bet",
    ledger: 0,
    description: pending.event?.description ?? "Bet submitted",
    raw_topics: pending.event?.raw_topics ?? [pending.address],
    tx_hash: pending.txHash,
    status: "pending",
    optimistic_id: optimisticId,
  };

  pendingBets.set(optimisticId, {
    optimisticId,
    txHash: pending.txHash,
    address: pending.address,
    event,
  });
  emit();
  return optimisticId;
}

export function confirmPendingBet(optimisticId: string, confirmedEvent?: DecodedEvent) {
  if (!pendingBets.has(optimisticId)) return;

  if (confirmedEvent) {
    confirmedEvent.status = "confirmed";
  }
  pendingBets.delete(optimisticId);
  emit();
}

export function removePendingBet(optimisticId: string) {
  if (!pendingBets.delete(optimisticId)) return;
  emit();
}

export function rollbackPendingBet(optimisticId: string, message = "Bet transaction failed on-chain.") {
  removePendingBet(optimisticId);
  window.dispatchEvent(new CustomEvent("bet:failed", { detail: { message } }));
}

export function reconcilePendingBet(optimisticId: string, confirmedEvent?: DecodedEvent) {
  confirmPendingBet(optimisticId, confirmedEvent);
  window.dispatchEvent(new CustomEvent("bet:confirmed", { detail: { optimisticId } }));
}

export function getPendingBets(address?: string): PendingBet[] {
  const bets = Array.from(pendingBets.values());
  return address ? bets.filter(bet => bet.address === address) : bets;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePendingBets(address?: string) {
  const key = address ?? "*";
  const snapshot = useSyncExternalStore(subscribe, () => {
    let cached = addressSnapshots.get(key);
    if (!cached) {
      cached = getPendingBets(address).map(bet => bet.event);
      addressSnapshots.set(key, cached);
    }
    return cached;
  });
  return snapshot;
}
