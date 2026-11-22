import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/Toast";
import { createBetId, readBets, writeBets } from "./history";
import type {
  Bet,
  BetGateway,
  BetInput,
  BetPhase,
  OddsPreviewState,
} from "./types";

interface OptimisticBetsOptions {
  address: string;
  gateway: BetGateway;
}

export function useBets(address: string) {
  return useQuery({
    queryKey: ["bets", address] as const,
    queryFn: () => readBets(address),
    enabled: !!address,
    staleTime: Infinity,
  });
}

export function useOptimisticBets({ address, gateway }: OptimisticBetsOptions) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const queryKey = useMemo(() => ["bets", address] as const, [address]);
  const inFlight = useRef(false);
  const [phase, setPhase] = useState<BetPhase>("idle");
  const [oddsPreview, setOddsPreview] = useState<OddsPreviewState>({
    status: "idle",
  });

  const placeBet = useCallback(
    async (input: BetInput) => {
      if (inFlight.current) return;
      if (!address) {
        toast.error("Connect your wallet before placing a bet.");
        return;
      }

      inFlight.current = true;
      let previous: Bet[] | undefined;
      setOddsPreview({ odds: input.odds, status: "pending" });
      setPhase("signing");

      try {
        const signed = await gateway.signBet(input, address);

        previous = queryClient.getQueryData<Bet[]>(queryKey) ?? readBets(address);
        const optimistic: Bet = {
          ...input,
          id: signed.txHash || createBetId(),
          address,
          status: "pending",
          createdAt: new Date().toISOString(),
          txHash: signed.txHash,
        };
        const pending = [optimistic, ...previous];
        queryClient.setQueryData(queryKey, pending);
        writeBets(address, pending);

        setPhase("submitting");
        await gateway.submitBet(signed);

        setPhase("confirming");
        const confirmation = await gateway.waitForConfirmation(signed.txHash);
        const confirmed = pending.map((bet) =>
          bet.id === optimistic.id
            ? {
                ...bet,
                status: "confirmed" as const,
                ledger: confirmation.ledger,
                event: confirmation.event,
              }
            : bet
        );

        queryClient.setQueryData(queryKey, confirmed);
        writeBets(address, confirmed);
        setOddsPreview({ odds: input.odds, status: "confirmed" });
        toast.success(`Bet confirmed in ledger ${confirmation.ledger}.`);

        void queryClient.invalidateQueries({ queryKey: ["wallet", address] });
        if (confirmation.event) {
          void queryClient.invalidateQueries({
            queryKey: ["events", confirmation.event.contract_id],
          });
        }
      } catch (error) {
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
          writeBets(address, previous);
        }
        setOddsPreview({ odds: input.odds, status: "failed" });
        toast.error(error instanceof Error ? error.message : "Bet could not be placed.");
      } finally {
        inFlight.current = false;
        setPhase("idle");
      }
    },
    [address, gateway, queryClient, queryKey, toast]
  );

  return { placeBet, phase, oddsPreview };
}
