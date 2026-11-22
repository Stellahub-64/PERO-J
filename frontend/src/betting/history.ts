import type { Bet } from "./types";

function storageKey(address: string): string {
  return `pero-j:bets:${address}`;
}

export function readBets(address: string): Bet[] {
  if (!address || typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Bet[]).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  } catch {
    return [];
  }
}

export function writeBets(address: string, bets: Bet[]): void {
  if (!address || typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(storageKey(address), JSON.stringify(bets));
  } catch {
    return;
  }
}

export function createBetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
