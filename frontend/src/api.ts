import { fetchWithFallback } from "./lib/api-client";
import {
  fetchContractFromRpc,
  fetchDistinctFunctionsFromRpc,
  fetchEventByTxHashFromRpc,
  fetchEventFromRpc,
  fetchEventsFromRpc,
  fetchWalletEventsFromRpc,
} from "./lib/rpc-fallback";

const BASE = import.meta.env.VITE_API_URL || "/api";

export interface DecodedEvent {
  seq: number;
  contract_id: string;
  function: string;
  ledger: number;
  description: string;
  raw_topics: string[];
  tx_hash?: string;
  created_at?: string;
  sac_asset?: string;
  onchain_seq?: number | null;
}

export interface ContractMeta {
  id: string;
  name: string;
  description: string;
  functions: { name: string; description: string }[];
  registered_by?: string;
  created_at?: string;
}

export interface WalletEventsResponse {
  events: DecodedEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface EventsResponse {
  events: DecodedEvent[];
  total: number;
  page: number;
  limit: number;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  distinctFunctions: () =>
    fetchWithFallback<string[]>("/functions", fetchDistinctFunctionsFromRpc),
  events: (params: { contract?: string; fn?: string; q?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params.contract) q.set("contract", params.contract);
    if (params.fn)       q.set("fn", params.fn);
    if (params.q)        q.set("q", params.q);
    if (params.page)     q.set("page", String(params.page));
    return fetchWithFallback<EventsResponse>(
      `/events?${q}`,
      () => fetchEventsFromRpc(params)
    );
  },
  event: (seq: number) =>
    fetchWithFallback<DecodedEvent>(`/events/${seq}`, () => fetchEventFromRpc(seq)),
  eventByTxHash: (hash: string) =>
    fetchWithFallback<DecodedEvent | null>(
      `/events/by-tx/${encodeURIComponent(hash)}`,
      () => fetchEventByTxHashFromRpc(hash)
    ),
  contract: (id: string) =>
    fetchWithFallback<ContractMeta>(`/contracts/${id}`, () => fetchContractFromRpc(id)),
  wallet: (address: string, page: number = 1) =>
    fetchWithFallback<WalletEventsResponse>(
      `/wallet/${address}?page=${page}`,
      () => fetchWalletEventsFromRpc(address, page)
    ),
  registerContract: (meta: ContractMeta) => post<{ ok: boolean }>("/contracts", meta),
};
