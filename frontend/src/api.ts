const BASE = import.meta.env.VITE_API_URL || "/api";

export interface DecodedEvent {
  seq: number;
  contract_id: string;
  function: string;
  ledger: number;
  description: string;
  raw_topics: string[];
  raw_data?: string;
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
  event_count?: number;
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

export interface ContractsResponse {
  contracts: ContractMeta[];
  total: number;
  page: number;
  limit: number;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, path: string) {
    super(`API ${status}: ${path}`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(BASE + path, { signal: controller.signal });
    if (!res.ok) throw new ApiError(res.status, path);
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
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json();
}

/**
 * Connect to the Server-Sent Events stream for live event updates.
 *
 * @param onEvent Callback invoked when a new DecodedEvent is streamed
 * @param onError Optional error handler callback
 * @returns Cleanup function that closes the EventSource connection
 */
export function streamEvents(
  onEvent: (event: DecodedEvent) => void,
  onError?: (err: Event) => void
): () => void {
  const url = `${BASE}/events/stream`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (e) => {
    try {
      const data: DecodedEvent = JSON.parse(e.data);
      onEvent(data);
    } catch (err) {
      console.error("Failed to parse SSE event:", err);
    }
  };

  if (onError) {
    eventSource.onerror = onError;
  }

  return () => {
    eventSource.close();
  };
}

export const api = {
  distinctFunctions: () => get<string[]>("/functions"),
  events: (params: { contract?: string; fn?: string; q?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params.contract) q.set("contract", params.contract);
    if (params.fn)       q.set("fn", params.fn);
    if (params.q)        q.set("q", params.q);
    if (params.page)     q.set("page", String(params.page));
    return get<EventsResponse>(`/events?${q}`);
  },
  event:            (seq: number)                         => get<DecodedEvent>(`/events/${seq}`),
  eventByTxHash:    (hash: string)                        => get<DecodedEvent | null>(`/events/by-tx/${encodeURIComponent(hash)}`),
  contracts:        (params: { q?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.q)       q.set("q", params.q);
    if (params.page)    q.set("page", String(params.page));
    if (params.limit)   q.set("limit", String(params.limit));
    return get<ContractsResponse>(`/contracts?${q}`);
  },
  contract:         (id: string)                          => get<ContractMeta>(`/contracts/${id}`),
  wallet:           (address: string, page: number = 1)   => get<WalletEventsResponse>(`/wallet/${address}?page=${page}`),
  registerContract: (meta: ContractMeta)                  => post<{ ok: boolean }>("/contracts", meta),
  streamEvents,
};
