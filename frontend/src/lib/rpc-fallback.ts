import { rpc, scValToNative } from "@stellar/stellar-sdk";
import type { ContractMeta, DecodedEvent, EventsResponse, WalletEventsResponse } from "../api";
import { bettingConfig } from "../betting/config";

const CACHE_TTL_MS = 5_000;
const LEDGER_WINDOW = 500;
const PAGE_SIZE = 25;

let cachedEvents: DecodedEvent[] | null = null;
let cacheExpiresAt = 0;

function createServer(): rpc.Server {
  return new rpc.Server(bettingConfig.rpcUrl, {
    allowHttp: bettingConfig.rpcUrl.startsWith("http://"),
  });
}

function sanitiseArg(value: unknown): string {
  const text = String(value);
  if (/^[0-9a-fA-F]{64,}$/.test(text) || /^[A-Za-z0-9+/]{44,}={0,2}$/.test(text)) {
    return "[REDACTED]";
  }
  if (text.length > 64) {
    return `${text.slice(0, 32)}…${text.slice(-16)}`;
  }
  return text;
}

function decodeEvent(event: rpc.Api.EventResponse, seq: number): DecodedEvent {
  const topics = event.topic.map((topic) => {
    try {
      return scValToNative(topic);
    } catch {
      return "<decode_error>";
    }
  });

  let data: unknown;
  try {
    data = scValToNative(event.value);
  } catch {
    data = "<decode_error>";
  }

  const fn = typeof topics[0] === "string" ? topics[0] : "unknown";
  const contractId = event.contractId?.contractId() ?? "";
  const args = topics.slice(1);

  return {
    seq,
    contract_id: contractId,
    function: fn,
    ledger: event.ledger,
    description: `${fn}(${args.map(sanitiseArg).join(", ")})${
      data === undefined ? "" : ` → ${sanitiseArg(data)}`
    } called on ${contractId}`,
    raw_topics: topics.map(String),
    tx_hash: event.txHash,
    created_at: event.ledgerClosedAt,
    onchain_seq: null,
  };
}

function paginate(events: DecodedEvent[], page: number, limit: number): EventsResponse {
  const start = (page - 1) * limit;
  return {
    events: events.slice(start, start + limit),
    total: events.length,
    page,
    limit,
  };
}

export function clearRpcFallbackCache(): void {
  cachedEvents = null;
  cacheExpiresAt = 0;
}

export async function loadRpcEvents(): Promise<DecodedEvent[]> {
  if (cachedEvents && Date.now() < cacheExpiresAt) return cachedEvents;

  const server = createServer();
  const latest = await server.getLatestLedger();
  const response = await server.getEvents({
    startLedger: Math.max(1, latest.sequence - LEDGER_WINDOW),
    filters: [{ type: "contract" }],
    limit: 200,
  });

  const events = response.events
    .filter((event) => !!event.contractId)
    .map((event, index) => decodeEvent(event, index + 1))
    .sort((a, b) => a.ledger - b.ledger || a.seq - b.seq)
    .map((event, index) => ({ ...event, seq: index + 1 }));

  cachedEvents = events;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return events;
}

export async function fetchDistinctFunctionsFromRpc(): Promise<string[]> {
  const events = await loadRpcEvents();
  return Array.from(new Set(events.map((event) => event.function))).sort();
}

export async function fetchEventsFromRpc(params: {
  contract?: string;
  fn?: string;
  q?: string;
  page?: number;
}): Promise<EventsResponse> {
  let events = await loadRpcEvents();

  if (params.contract) {
    events = events.filter((event) => event.contract_id === params.contract);
  }
  if (params.fn) {
    events = events.filter((event) => event.function === params.fn);
  }
  if (params.q) {
    const query = params.q.toLowerCase();
    events = events.filter(
      (event) =>
        event.description.toLowerCase().includes(query) ||
        event.raw_topics.some((topic) => topic.toLowerCase().includes(query))
    );
  }

  return paginate(events, params.page ?? 1, PAGE_SIZE);
}

export async function fetchEventFromRpc(seq: number): Promise<DecodedEvent> {
  const events = await loadRpcEvents();
  const event = events.find((item) => item.seq === seq);
  if (!event) throw new Error(`Event ${seq} not found on-chain`);
  return event;
}

export async function fetchEventByTxHashFromRpc(hash: string): Promise<DecodedEvent | null> {
  const events = await loadRpcEvents();
  return events.find((event) => event.tx_hash === hash) ?? null;
}

export async function fetchContractFromRpc(id: string): Promise<ContractMeta> {
  const events = (await loadRpcEvents()).filter((event) => event.contract_id === id);
  const functions = Array.from(new Set(events.map((event) => event.function))).map((name) => ({
    name,
    description: `${name} events observed on-chain`,
  }));

  return {
    id,
    name: id,
    description: "Contract data loaded directly from Soroban RPC.",
    functions,
  };
}

export async function fetchWalletEventsFromRpc(
  address: string,
  page: number = 1
): Promise<WalletEventsResponse> {
  const events = (await loadRpcEvents()).filter(
    (event) =>
      event.description.includes(address) ||
      event.raw_topics.some((topic) => topic.includes(address))
  );
  const result = paginate(events, page, PAGE_SIZE);
  return { ...result, limit: PAGE_SIZE };
}
