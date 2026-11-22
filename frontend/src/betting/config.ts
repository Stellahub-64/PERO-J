import { Networks } from "@stellar/stellar-sdk";
import type { BetMarket } from "./types";

export const bettingConfig = {
  contractId: import.meta.env.VITE_BET_CONTRACT_ID || "",
  rpcUrl: import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET,
  confirmationTimeoutMs: 45_000,
  pollIntervalMs: 1_500,
};

export const markets: BetMarket[] = [
  {
    id: "next_ledger",
    title: "Will the next ledger confirm within 10 seconds?",
    outcomes: [
      { id: "yes", label: "Yes", odds: 1.95 },
      { id: "no", label: "No", odds: 1.85 },
    ],
  },
];
