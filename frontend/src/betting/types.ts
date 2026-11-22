import type { DecodedEvent } from "../api";

export type BetStatus = "pending" | "confirmed";
export type OddsStatus = "idle" | "pending" | "confirmed" | "failed";
export type BetPhase = "idle" | "signing" | "submitting" | "confirming";

export interface BetOutcome {
  id: string;
  label: string;
  odds: number;
}

export interface BetMarket {
  id: string;
  title: string;
  outcomes: BetOutcome[];
}

export interface BetInput {
  marketId: string;
  selection: string;
  amount: number;
  odds: number;
}

export interface Bet extends BetInput {
  id: string;
  address: string;
  status: BetStatus;
  createdAt: string;
  txHash: string;
  ledger?: number;
  event?: DecodedEvent;
}

export interface OddsPreviewState {
  odds?: number;
  status: OddsStatus;
}

export interface SignedBet {
  txHash: string;
  signedXdr: string;
  input: BetInput;
  address: string;
}

export interface BetConfirmation {
  ledger: number;
  event?: DecodedEvent;
}

export interface BetGateway {
  connect(): Promise<string>;
  signBet(input: BetInput, address: string): Promise<SignedBet>;
  submitBet(signed: SignedBet): Promise<void>;
  waitForConfirmation(txHash: string): Promise<BetConfirmation>;
}
