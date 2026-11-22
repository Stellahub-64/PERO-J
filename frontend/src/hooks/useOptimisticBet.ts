import { useCallback, useEffect, useRef, useState } from "react";

export type BetStatus = "pending" | "confirmed" | "failed";

export interface OptimisticBet<T = unknown> {
  id: string;
  bet: T;
  status: BetStatus;
  transactionHash?: string;
  error?: string;
}

interface SubmitBetOptions<T> {
  bet: T;
  submitTransaction: (bet: T) => Promise<string>;
  reconcile: (transactionHash: string) => Promise<T | null>;
  onError?: (error: string) => void;
  pollingIntervalMs?: number;
  timeoutMs?: number;
}

export function useOptimisticBet<T>(initial: OptimisticBet<T>[] = []) {
  const [bets, setBets] = useState<OptimisticBet<T>[]>(initial);
  const activePolls = useRef(new Set<ReturnType<typeof setInterval>>());

  useEffect(() => {
    const polls = activePolls.current;
    return () => {
      polls.forEach(interval => clearInterval(interval));
      polls.clear();
    };
  }, []);

  const addBet = useCallback((bet: T) => {
    const pending: OptimisticBet<T> = {
      id: `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      bet,
      status: "pending",
    };
    setBets(current => [pending, ...current]);
    return pending.id;
  }, []);

  const removeBet = useCallback((id: string) => {
    setBets(current => current.filter(item => item.id !== id));
  }, []);

  const submitBet = useCallback(async ({
    bet,
    submitTransaction,
    reconcile,
    onError,
    pollingIntervalMs = 1500,
    timeoutMs = 30000,
  }: SubmitBetOptions<T>) => {
    const id = addBet(bet);
    const startedAt = Date.now();

    try {
      const transactionHash = await submitTransaction(bet);
      setBets(current => current.map(item =>
        item.id === id ? { ...item, transactionHash } : item,
      ));

      await new Promise<void>((resolve, reject) => {
        let finished = false;
        const interval = setInterval(async () => {
          if (finished) return;
          try {
            const confirmedBet = await reconcile(transactionHash);
            if (confirmedBet) {
              finished = true;
              clearInterval(interval);
              activePolls.current.delete(interval);
              setBets(current => current.map(item =>
                item.id === id
                  ? { ...item, bet: confirmedBet, status: "confirmed" }
                  : item,
              ));
              resolve();
            } else if (Date.now() - startedAt >= timeoutMs) {
              throw new Error("Transaction confirmation timed out");
            }
          } catch (error) {
            finished = true;
            clearInterval(interval);
            activePolls.current.delete(interval);
            reject(error);
          }
        }, pollingIntervalMs);
        activePolls.current.add(interval);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed";
      setBets(current => current.filter(item => item.id !== id));
      onError?.(message);
    }
  }, [addBet]);

  return { bets, addBet, removeBet, submitBet };
}
