const BASE = import.meta.env.VITE_API_URL || "/api";
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

export type ApiMode = "backend" | "onchain";

type ModeListener = (mode: ApiMode) => void;
type BackendError = Error & {
  status?: number;
  timedOut?: boolean;
  network?: boolean;
};

export interface FallbackOptions {
  timeoutMs?: number;
}

function envFlag(name: "NEXT_PUBLIC_USE_BACKEND" | "VITE_USE_BACKEND"): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function resolveInitialMode(): ApiMode {
  const raw = envFlag("NEXT_PUBLIC_USE_BACKEND") ?? envFlag("VITE_USE_BACKEND") ?? "true";
  return raw.toLowerCase() === "false" || raw === "0" ? "onchain" : "backend";
}

let mode = resolveInitialMode();
const listeners = new Set<ModeListener>();

export function getApiMode(): ApiMode {
  return mode;
}

export function subscribeApiMode(listener: ModeListener): () => void {
  listeners.add(listener);
  listener(mode);
  return () => {
    listeners.delete(listener);
  };
}

export function isRetryableBackendError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const failure = error as BackendError;
  return (
    failure.timedOut === true ||
    failure.network === true ||
    (typeof failure.status === "number" && RETRYABLE_STATUSES.has(failure.status))
  );
}

function useOnChainMode(): void {
  if (mode === "onchain") return;
  mode = "onchain";
  listeners.forEach((listener) => listener(mode));
}

async function requestBackend<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  try {
    const response = await fetch(BASE + path, {
      ...init,
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      const error = new Error(`API ${response.status}: ${path}`) as BackendError;
      error.status = response.status;
      throw error;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error(`Request timed out: ${path}`) as BackendError;
      timeoutError.timedOut = true;
      throw timeoutError;
    }
    if (error instanceof TypeError) {
      const networkError = new Error("Backend API is unreachable") as BackendError;
      networkError.network = true;
      throw networkError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestWithFallback<T>(
  path: string,
  init: RequestInit,
  fallback: () => Promise<T>,
  options: FallbackOptions = {}
): Promise<T> {
  if (mode === "onchain") return fallback();

  try {
    return await requestBackend<T>(path, init, options.timeoutMs ?? 10_000);
  } catch (error) {
    if (!isRetryableBackendError(error)) throw error;
    useOnChainMode();
    return fallback();
  }
}

export function fetchWithFallback<T>(
  path: string,
  fallback: () => Promise<T>,
  options: FallbackOptions = {}
): Promise<T> {
  return requestWithFallback<T>(path, {}, fallback, options);
}
