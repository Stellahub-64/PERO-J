import {
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";
import { api } from "../api";
import { bettingConfig } from "./config";
import type {
  BetConfirmation,
  BetGateway,
  BetInput,
  SignedBet,
} from "./types";

interface FreighterAPI {
  isConnected(): Promise<boolean>;
  connect(): Promise<{ address: string }>;
  getAddress(): Promise<{ address: string }>;
  signTransaction(
    xdr: string,
    options: { networkPassphrase: string }
  ): Promise<{ signedTransaction: string }>;
}

declare global {
  interface Window {
    freighter?: FreighterAPI;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getServer(): rpc.Server {
  return new rpc.Server(bettingConfig.rpcUrl, {
    allowHttp: bettingConfig.rpcUrl.startsWith("http://"),
  });
}

function getFreighter(): FreighterAPI {
  if (!window.freighter) {
    throw new Error("Freighter wallet is not installed.");
  }
  return window.freighter;
}

export class StellarBetGateway implements BetGateway {
  async connect(): Promise<string> {
    const freighter = getFreighter();
    if (!(await freighter.isConnected())) {
      await freighter.connect();
    }
    const { address } = await freighter.getAddress();
    return address;
  }

  async signBet(input: BetInput, address: string): Promise<SignedBet> {
    if (!bettingConfig.contractId) {
      throw new Error("Betting contract is not configured.");
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("Enter a valid stake amount.");
    }

    const freighter = getFreighter();
    const server = getServer();
    const account = await server.getAccount(address);
    const contract = new Contract(bettingConfig.contractId);
    const amountInStroops = BigInt(Math.round(input.amount * 10_000_000)).toString();

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: bettingConfig.networkPassphrase,
    })
      .addOperation(
        contract.call(
          "place_bet",
          nativeToScVal(input.marketId, { type: "symbol" }),
          nativeToScVal(input.selection, { type: "symbol" }),
          nativeToScVal(amountInStroops, { type: "i128" })
        )
      )
      .setTimeout(60)
      .build();

    const simulation = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation)) {
      throw new Error(simulation.error || "Bet transaction simulation failed.");
    }

    const prepared = rpc.assembleTransaction(tx, simulation).build();
    const { signedTransaction } = await freighter.signTransaction(
      prepared.toXDR(),
      { networkPassphrase: bettingConfig.networkPassphrase }
    );
    const signedTx = TransactionBuilder.fromXDR(
      signedTransaction,
      bettingConfig.networkPassphrase
    ) as { hash(): Uint8Array };

    return {
      txHash: toHex(signedTx.hash()),
      signedXdr: signedTransaction,
      input,
      address,
    };
  }

  async submitBet(signed: SignedBet): Promise<void> {
    const tx = TransactionBuilder.fromXDR(
      signed.signedXdr,
      bettingConfig.networkPassphrase
    );
    const result = await getServer().sendTransaction(tx);

    if (result.status === "ERROR") {
      throw new Error("The network rejected the bet transaction.");
    }
    if (result.status === "TRY_AGAIN_LATER") {
      throw new Error("The network is busy. Try placing the bet again.");
    }
  }

  async waitForConfirmation(txHash: string): Promise<BetConfirmation> {
    const deadline = Date.now() + bettingConfig.confirmationTimeoutMs;
    const server = getServer();

    while (Date.now() < deadline) {
      const tx = await server.getTransaction(txHash);

      if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error("Bet transaction failed on-chain.");
      }
      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        const event = await this.waitForIndexedEvent(txHash, deadline);
        return { ledger: tx.ledger, event };
      }

      await delay(bettingConfig.pollIntervalMs);
    }

    throw new Error("Timed out waiting for bet confirmation.");
  }

  private async waitForIndexedEvent(
    txHash: string,
    deadline: number
  ): Promise<BetConfirmation["event"]> {
    const indexerDeadline = Math.min(deadline, Date.now() + 10_000);
    while (Date.now() < indexerDeadline) {
      try {
        const event = await api.eventByTxHash(txHash);
        if (event) return event;
      } catch {
        await delay(Math.min(bettingConfig.pollIntervalMs, 1_000));
        continue;
      }
      await delay(Math.min(bettingConfig.pollIntervalMs, 1_000));
    }
    return undefined;
  }
}
