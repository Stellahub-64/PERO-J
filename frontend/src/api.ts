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

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(BASE + path, { signal: controller.signal });
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  events: (params: { contract?: string; fn?: string; q?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params.contract) q.set("contract", params.contract);
    if (params.fn)       q.set("fn", params.fn);
    if (params.q)        q.set("q", params.q);
    if (params.page)     q.set("page", String(params.page));
    return get<EventsResponse>(`/events?${q}`);
  },
  event:            (seq: number)                         => get<DecodedEvent>(`/events/${seq}`),
  contract:         (id: string)                          => get<ContractMeta>(`/contracts/${id}`),
  wallet:           (address: string, page: number = 1)   => get<WalletEventsResponse>(`/wallet/${address}?page=${page}`),
  registerContract: (meta: ContractMeta)                  => post<{ ok: boolean }>("/contracts", meta),
};
